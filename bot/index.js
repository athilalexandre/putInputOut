import { Client, GatewayIntentBits } from 'discord.js';
import { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus, getVoiceConnection, StreamType, generateDependencyReport } from '@discordjs/voice';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import ffmpegPath from 'ffmpeg-static';
import 'opusscript'; // Force OpusScript registration if native fail

// Carregar variáveis de ambiente
dotenv.config();
if (!process.env.DISCORD_TOKEN && fs.existsSync(path.join(process.cwd(), 'env'))) {
  dotenv.config({ path: path.join(process.cwd(), 'env') });
}

// Configurar FFmpeg (Importante para dependências internas)
if (ffmpegPath) {
  process.env.FFMPEG_PATH = ffmpegPath;
}

// Nota: Cookies removidos pois createAgent não está disponível nesta versão
// Se necessário no futuro, considerar usar yt-dlp como alternativa

console.log('🚀 [BOT v8.0] ULTIMATE EDITION - LOCAL & YOUTUBE');
console.log('--- VOICE DEPENDENCY REPORT ---');
console.log(generateDependencyReport());
console.log('-------------------------------');

// Configuração do bot Discord

// Configuração do bot Discord
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once('ready', async () => {
  console.log(`✅ BOT ONLINE: ${client.user.tag}`);
});

// Configuração do Express
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());
app.use(cors({ origin: '*' }));

// Estado global
const voiceConnections = new Map();
const audioPlayers = new Map();

// Configuração de Upload (Multer)
const soundsUploadDir = path.join(process.cwd(), 'sounds');
if (!fs.existsSync(soundsUploadDir)) {
  fs.mkdirSync(soundsUploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, soundsUploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowed = ['.mp3', '.wav', '.ogg', '.m4a'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Formato não suportado!'));
  },
  limits: { fileSize: 15 * 1024 * 1024 } // 15MB
});

// --- FUNÇÕES DE ÁUDIO ---

// 1. Tocar Arquivo Local (Simples e Direto)
// 1. Tocar Arquivo Local (Via FFmpeg Opus para garantir compatibilidade)
// 1. Tocar Arquivo Local (Via FFmpeg PCM s16le - Mais compatível se Ogg falhar)
function createLocalResource(filePath) {
  console.log(`💿 Criando resource local (PCM s16le): ${filePath}`);

  const ffmpeg = spawn(ffmpegPath, [
    '-i', filePath,
    '-f', 's16le', // Raw PCM
    '-ac', '2',    // 2 Channels
    '-ar', '48000',// 48khz
    'pipe:1'
  ]);

  ffmpeg.stderr.on('data', d => { console.log(`FFmpeg Log: ${d}`); });

  return createAudioResource(ffmpeg.stdout, {
    inputType: StreamType.Raw, // Importante: Raw PCM
    inlineVolume: true
  });
}

// 2. Tocar Stream (YouTube/Spotify via yt-dlp local)
// yt-dlp.exe está na pasta do bot
const ytdlpPath = path.join(process.cwd(), 'yt-dlp.exe');
const cookiesPath = path.join(process.cwd(), '..', 'www.youtube.com_cookies.txt');

async function createStreamResource(url) {
  // Verificar se é YouTube
  const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');

  if (!isYouTube) {
    console.log('⚠️ URL não é YouTube');
    return null;
  }

  console.log('🔗 YouTube detectado');

  // Verificar se yt-dlp existe
  if (!fs.existsSync(ytdlpPath)) {
    console.error('❌ yt-dlp.exe não encontrado em:', ytdlpPath);
    console.error('Por favor, baixe de: https://github.com/yt-dlp/yt-dlp/releases');
    return null;
  }

  // Verificar se cookies existem
  const hasCookies = fs.existsSync(cookiesPath);
  if (hasCookies) {
    console.log('🍪 Usando cookies do YouTube para autenticação');
  } else {
    console.log('⚠️ Cookies não encontrados - stream pode ser limitado');
  }

  try {
    // Argumentos do yt-dlp com flags robustas para evitar corte de stream
    const args = [
      '-f', 'bestaudio[ext=webm]/bestaudio/best', // Preferir webm para melhor streaming
      '-o', '-',  // Output para stdout
      '--no-playlist',
      '--no-warnings',
      '--no-check-certificates',
      '--retries', '10',           // Tentar novamente em caso de erro
      '--fragment-retries', '10',  // Retry em fragmentos
      '--buffer-size', '16K',      // Buffer maior para estabilidade
      '--http-chunk-size', '10M',  // Chunks maiores
    ];

    // Adicionar cookies se disponíveis (evita throttling/corte)
    if (hasCookies) {
      args.push('--cookies', cookiesPath);
    }



    args.push(url);

    console.log(`▶️ Executando: ${ytdlpPath} ${args.slice(0, 5).join(' ')} ... ${url}`);

    const ytdlp = spawn(ytdlpPath, args);

    // Usar FFmpeg para converter para PCM
    const ffmpeg = spawn(ffmpegPath, [
      '-i', 'pipe:0',
      '-f', 's16le',
      '-ac', '2',
      '-ar', '48000',
      '-loglevel', 'warning',  // Mostrar warnings para debug
      'pipe:1'
    ]);

    // Pipe yt-dlp -> FFmpeg
    ytdlp.stdout.pipe(ffmpeg.stdin);

    // Logging detalhado
    ytdlp.stderr.on('data', d => {
      const msg = d.toString().trim();
      if (msg) {
        // Filtrar mensagens de progresso para não poluir o console
        if (!msg.includes('[download]') || msg.includes('100%')) {
          console.log(`yt-dlp: ${msg}`);
        }
      }
    });

    ytdlp.on('error', (err) => {
      console.error('❌ Erro ao executar yt-dlp:', err.message);
    });

    ytdlp.on('close', (code) => {
      if (code !== 0 && code !== null) {
        console.log(`⚠️ yt-dlp encerrou com código: ${code}`);
      } else {
        console.log('✅ yt-dlp finalizou stream com sucesso');
      }
    });

    ffmpeg.stderr.on('data', d => {
      const msg = d.toString().trim();
      if (msg && !msg.includes('time=')) console.log(`FFmpeg: ${msg}`);
    });

    ffmpeg.on('close', (code) => {
      if (code !== 0 && code !== null) {
        console.log(`⚠️ FFmpeg encerrou com código: ${code}`);
      }
    });

    // Retornar o resource do FFmpeg
    return createAudioResource(ffmpeg.stdout, {
      inputType: StreamType.Raw,
      inlineVolume: true
    });

  } catch (e) {
    console.error('❌ Erro no Stream:', e.message);
    return null;
  }
}

// 3. Resolver MyInstants/Direct
async function resolveAndCreateDirectResource(url) {
  let targetUrl = url;

  // MyInstants Scraper rapidinho
  if (url.includes('myinstants.com') && !url.endsWith('.mp3')) {
    try {
      const response = await fetch(url);
      const html = await response.text();
      const match = html.match(/https?:\/\/www\.myinstants\.com\/media\/sounds\/[^"']+\.mp3/i) ||
        html.match(/\/media\/sounds\/[^"']+\.mp3/i);
      if (match) {
        targetUrl = match[0].startsWith('/') ? 'https://www.myinstants.com' + match[0] : match[0];
      }
    } catch (e) { console.error('Erro MyInstants:', e); }
  }

  // Tocar via URL direta; createAudioResource lida com http/https usando ffmpeg por trás
  console.log(`🌐 Stream Remoto Direto: ${targetUrl}`);
  return createAudioResource(targetUrl, { inlineVolume: true });
}

// 4. Gerenciador de Conexão
async function getOrJoinConnection(guildId, channelId, adapterCreator) {
  let connection = getVoiceConnection(guildId);

  if (!connection) {
    console.log(`🔌 Iniciando nova conexão de voz no canal: ${channelId}`);
    connection = joinVoiceChannel({
      channelId: channelId,
      guildId: guildId,
      adapterCreator: adapterCreator,
      selfDeaf: false,
      selfMute: false
    });

    connection.on(VoiceConnectionStatus.Ready, () => {
      console.log('✅ Conexão de voz: READY (Pronto para transmitir)');
    });

    connection.on(VoiceConnectionStatus.Signalling, () => {
      console.log('⚠️ Conexão de voz: SIGNALLING (Negociando)');
    });

    connection.on(VoiceConnectionStatus.Connecting, () => {
      console.log('🔄 Conexão de voz: CONNECTING');
    });

    connection.on(VoiceConnectionStatus.Disconnected, () => {
      console.log('❌ Conexão de voz: DISCONNECTED');
      try {
        connection.destroy();
      } catch (error) {
        console.warn('Falha ao destruir conexao de voz ja desconectada:', error.message);
      }
      voiceConnections.delete(guildId);
      audioPlayers.delete(guildId);
    });

    // Debug networking
    connection.on('error', (error) => {
      console.error('🔥 Erro na conexão de voz:', error);
    });
  } else {
    // Se já existe, verificar estado
    console.log(`ℹ️ Conexão existente. Estado: ${connection.state.status}`);
    // Se o canal mudou, reconecta? Por enquanto, assume que está certo ou o usuario reconecta.
  }

  return connection;
}

// --- ENDPOINTS EXPRESS ---

app.get('/health', (req, res) => res.json({ status: 'ok', v: '8.0' }));

app.get('/api/sounds', (req, res) => {
  try {
    const p = path.join(process.cwd(), '../web/sounds.json');
    if (fs.existsSync(p)) res.json(JSON.parse(fs.readFileSync(p, 'utf8')));
    else res.json([]);
  } catch (e) { res.status(500).json([]); }
});

app.post('/api/sounds/upload', upload.single('audio'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Sem arquivo' });
  const soundName = req.body.name || path.parse(req.file.originalname).name;
  const p = path.join(process.cwd(), '../web/sounds.json');
  try {
    let sounds = [];
    if (fs.existsSync(p)) sounds = JSON.parse(fs.readFileSync(p, 'utf8'));
    sounds.push({ name: soundName, url: req.file.path });
    fs.writeFileSync(p, JSON.stringify(sounds, null, 2));
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Estado do player para cada guild
const playerState = new Map();

// Endpoint para obter status do player
app.get('/status/:guildId', (req, res) => {
  const { guildId } = req.params;
  const player = audioPlayers.get(guildId);
  const state = playerState.get(guildId) || {};

  if (!player) {
    return res.json({
      status: 'idle',
      trackName: null,
      startedAt: null
    });
  }

  res.json({
    status: player.state.status,
    trackName: state.trackName || 'Áudio desconhecido',
    startedAt: state.startedAt || null,
    source: state.source || 'unknown'
  });
});

// Endpoint para pausar o áudio
app.post('/pause', (req, res) => {
  const { guildId } = req.body;
  console.log(`⏸️ Pause: ${guildId}`);

  const player = audioPlayers.get(guildId);
  if (!player) {
    return res.status(404).json({ error: 'Nenhum player ativo' });
  }

  player.pause();
  res.json({ success: true, status: 'paused' });
});

// Endpoint para retomar o áudio
app.post('/resume', (req, res) => {
  const { guildId } = req.body;
  console.log(`▶️ Resume: ${guildId}`);

  const player = audioPlayers.get(guildId);
  if (!player) {
    return res.status(404).json({ error: 'Nenhum player ativo' });
  }

  player.unpause();
  res.json({ success: true, status: 'playing' });
});

// Endpoint para parar o áudio
app.post('/stop', (req, res) => {
  const { guildId } = req.body;
  console.log(`⏹️ Stop: ${guildId}`);

  const player = audioPlayers.get(guildId);
  if (!player) {
    return res.status(404).json({ error: 'Nenhum player ativo' });
  }

  player.stop();
  res.json({ success: true, status: 'stopped' });
});

// Armazenar o último resource para controle de volume
const currentResources = new Map();

// Endpoint para alterar volume em tempo real
app.post('/volume', (req, res) => {
  const { guildId, volume } = req.body;
  console.log(`🔊 Volume: ${guildId} -> ${volume}`);

  const resource = currentResources.get(guildId);
  if (resource && resource.volume) {
    resource.volume.setVolume(Number(volume));
    res.json({ success: true, volume: Number(volume) });
  } else {
    // Armazenar para próximo play
    res.json({ success: true, message: 'Volume será aplicado no próximo play' });
  }
});

// Endpoint para atualizar nome de um som
app.post('/api/sounds/update', (req, res) => {
  const { url, newName } = req.body;
  console.log(`✏️ Update Sound: ${url} -> ${newName}`);

  if (!url || !newName) {
    return res.status(400).json({ error: 'Missing url or newName' });
  }

  const p = path.join(process.cwd(), '../web/sounds.json');
  try {
    if (!fs.existsSync(p)) {
      return res.status(404).json({ error: 'sounds.json não encontrado' });
    }

    let sounds = JSON.parse(fs.readFileSync(p, 'utf8'));
    const soundIndex = sounds.findIndex(s => s.url === url);

    if (soundIndex === -1) {
      return res.status(404).json({ error: 'Som não encontrado' });
    }

    sounds[soundIndex].name = newName;
    fs.writeFileSync(p, JSON.stringify(sounds, null, 2));

    console.log(`✅ Som atualizado: ${newName}`);
    res.json({ success: true, sound: sounds[soundIndex] });
  } catch (e) {
    console.error('❌ Erro ao atualizar som:', e);
    res.status(500).json({ error: e.message });
  }
});

// Endpoint para deletar um som (requer senha)
const DELETE_PASSWORD = '12345';

app.post('/api/sounds/delete', (req, res) => {
  const { url, password } = req.body;
  console.log(`🗑️ Delete Sound: ${url}`);

  if (!url) {
    return res.status(400).json({ error: 'Missing url' });
  }

  // Verificar senha
  if (password !== DELETE_PASSWORD) {
    console.log('❌ Senha incorreta para deletar');
    return res.status(401).json({ error: 'Senha incorreta' });
  }

  const p = path.join(process.cwd(), '../web/sounds.json');
  try {
    if (!fs.existsSync(p)) {
      return res.status(404).json({ error: 'sounds.json não encontrado' });
    }

    let sounds = JSON.parse(fs.readFileSync(p, 'utf8'));
    const filteredSounds = sounds.filter(s => s.url !== url);

    if (filteredSounds.length === sounds.length) {
      return res.status(404).json({ error: 'Som não encontrado' });
    }

    fs.writeFileSync(p, JSON.stringify(filteredSounds, null, 2));

    console.log(`✅ Som deletado`);
    res.json({ success: true });
  } catch (e) {
    console.error('❌ Erro ao deletar som:', e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/play', async (req, res) => {
  const { guildId, voiceChannelId, soundUrl, volume, secret } = req.body;
  console.log(`🎵 Play: ${soundUrl}`);

  if (!guildId || !voiceChannelId || !soundUrl) return res.status(400).json({ error: 'Missing params' });
  if (process.env.SHARED_SECRET && secret !== process.env.SHARED_SECRET) {
    return res.status(401).json({ error: 'Invalid secret' });
  }

  try {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return res.status(404).json({ error: 'Bot não está no servidor' });

    const connection = await getOrJoinConnection(guildId, voiceChannelId, guild.voiceAdapterCreator);

    let player = audioPlayers.get(guildId);
    if (!player) {
      player = createAudioPlayer();
      connection.subscribe(player);
      audioPlayers.set(guildId, player);

      player.on('error', error => {
        console.error('❌ Player Error:', error.message);
      });

      player.on(AudioPlayerStatus.Playing, () => {
        console.log('▶️ Player mudou para: PLAYING');
      });

      player.on(AudioPlayerStatus.Idle, () => {
        console.log('⏹️ Player mudou para: IDLE');
      });
    }

    let resource;

    // Detectar Origem
    if ((soundUrl.includes('youtube.com') || soundUrl.includes('youtu.be'))) {
      console.log('🔗 Detectado YouTube');
      try {
        resource = await createStreamResource(soundUrl);
      } catch (e) {
        console.error('Erro play-dl:', e);
        throw new Error('Falha ao processar link externo');
      }
    } else {
      // Arquivo Local ou Link Direto
      const isLocal = !soundUrl.startsWith('http');

      if (isLocal) {
        let cleanPath = soundUrl.replace(/^"/, '').replace(/"$/, ''); // Limpar aspas se houver
        console.log(`📂 Arquivo local: ${cleanPath}`);
        
        let finalPath = cleanPath;
        if (!fs.existsSync(finalPath)) {
          const filename = path.basename(cleanPath);
          const fallbackPath = path.join(process.cwd(), 'sounds', filename);
          console.log(`🔍 Arquivo não encontrado no caminho original. Tentando fallback: ${fallbackPath}`);
          if (fs.existsSync(fallbackPath)) {
            finalPath = fallbackPath;
          } else {
            const webFallbackPath = path.join(process.cwd(), '../web/sounds', filename);
            console.log(`🔍 Tentando segundo fallback: ${webFallbackPath}`);
            if (fs.existsSync(webFallbackPath)) {
              finalPath = webFallbackPath;
            } else {
              throw new Error(`Arquivo não encontrado: ${cleanPath}`);
            }
          }
        }
        
        resource = createLocalResource(finalPath);
      } else {
        console.log('🌐 Link Direto / MyInstants');
        resource = await resolveAndCreateDirectResource(soundUrl);
      }
    }

    if (!resource) throw new Error('Não foi possível gerar o áudio.');

    if (volume) resource.volume?.setVolume(Number(volume));

    // Armazenar informações da faixa
    let trackName = 'Áudio';
    let source = 'unknown';

    if (soundUrl.includes('youtube.com') || soundUrl.includes('youtu.be')) {
      trackName = 'YouTube';
      source = 'youtube';
    } else if (soundUrl.includes('myinstants.com')) {
      trackName = 'MyInstants';
      source = 'myinstants';
    } else if (!soundUrl.startsWith('http')) {
      // Arquivo local - extrair nome do arquivo
      trackName = path.basename(soundUrl).replace(/\.[^/.]+$/, '');
      source = 'local';
    } else {
      trackName = 'Stream Direto';
      source = 'direct';
    }

    playerState.set(guildId, {
      trackName,
      source,
      startedAt: Date.now()
    });

    player.stop(); // Parar atual antes de tocar novo
    player.play(resource);

    res.json({ success: true, trackName });

  } catch (error) {
    console.error('❌ Erro Fatal no Play:', error);
    res.status(500).json({ error: error.message });
  }
});

// Comandos texto simples
client.on('messageCreate', async (msg) => {
  if (msg.author.bot || !msg.content.startsWith('!')) return;
  const args = msg.content.slice(1).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();

  if (cmd === 'stop') {
    const player = audioPlayers.get(msg.guildId);
    if (player) player.stop();
    msg.reply('🛑 Parado.');
  }
});

if (process.env.DISCORD_TOKEN) client.login(process.env.DISCORD_TOKEN);

// Tratamento de erros globais
process.on('uncaughtException', (err) => {
  console.error('🔥 CRITICAL ERROR (Uncaught):', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('🔥 CRITICAL ERROR (Unhandled Rejection):', reason);
});

app.listen(PORT, () => {
  console.log(`🔊 SERVER AUDIO ONLINE NA PORTA ${PORT}`);
});
