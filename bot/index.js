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
import play from 'play-dl';
import ytdl from '@distube/ytdl-core';
import 'opusscript'; // Force OpusScript registration if native fail

// Carregar variáveis de ambiente
dotenv.config();

// Configurar FFmpeg (Importante para dependências internas)
if (ffmpegPath) {
  process.env.FFMPEG_PATH = ffmpegPath;
}

console.log('🚀 [BOT v8.0] ULTIMATE EDITION - LOCAL, YOUTUBE & SPOTIFY');
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

// 2. Tocar Stream (YouTube/Spotify via ytdl-core/play-dl)
async function createStreamResource(url) {
  try {
    // 1. Tentar YouTube com @distube/ytdl-core
    if (ytdl.validateURL(url)) {
      console.log('🔗 YouTube detectado (ytdl-core)');

      try {
        // Adicionar opções para evitar bloqueio
        const stream = ytdl(url, {
          filter: 'audioonly',
          quality: 'lowestaudio', // Usar qualidade mais baixa para evitar bloqueio
          highWaterMark: 1 << 25,
          requestOptions: {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept-Language': 'en-US,en;q=0.9',
            }
          }
        });

        stream.on('error', (err) => {
          console.error('❌ Erro no stream YTDL:', err.message);
        });

        return createAudioResource(stream, {
          inputType: StreamType.Arbitrary,
          inlineVolume: true
        });
      } catch (ytErr) {
        console.error('❌ Falha YTDL:', ytErr.message);
        // Fallback: tentar play-dl para YouTube
        console.log('🔄 Tentando fallback com play-dl...');
        try {
          const streamInfo = await play.stream(url, { discordPlayerCompatibility: true });
          if (streamInfo) {
            return createAudioResource(streamInfo.stream, {
              inputType: streamInfo.type,
              inlineVolume: true
            });
          }
        } catch (playErr) {
          console.error('❌ Fallback play-dl também falhou:', playErr.message);
        }
        return null;
      }
    }

    // 2. Fallback para Spotify com play-dl
    const type = await play.validate(url);
    if (type === 'sp_track' || type === 'sp_playlist') {
      if (play.is_expired()) await play.refreshToken();
      let streamInfo;

      if (type === 'sp_playlist') {
        const playlist = await play.spotify(url);
        const firstTrack = playlist.fetched_tracks.get('1');
        if (firstTrack) {
          streamInfo = await play.stream(firstTrack.url, { discordPlayerCompatibility: true });
        }
      } else {
        streamInfo = await play.stream(url, { discordPlayerCompatibility: true });
      }

      if (streamInfo) {
        return createAudioResource(streamInfo.stream, {
          inputType: streamInfo.type,
          inlineVolume: true
        });
      }
    }
  } catch (e) {
    console.error('❌ Erro no Stream:', e.message);
    return null;
  }
  return null;
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
      try { connection.destroy(); } catch (e) { }
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

app.delete('/api/sounds/delete', (req, res) => {
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
  const { guildId, voiceChannelId, soundUrl, volume } = req.body;
  console.log(`🎵 Play: ${soundUrl}`);

  if (!guildId || !voiceChannelId || !soundUrl) return res.status(400).json({ error: 'Missing params' });

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
    if ((soundUrl.includes('youtube.com') || soundUrl.includes('youtu.be') || soundUrl.includes('spotify.com'))) {
      console.log('🔗 Detectado YouTube/Spotify');
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
        if (fs.existsSync(cleanPath)) {
          // createAudioResource lida mt bem com arquivos locais se não especificarmos inputType errado
          // Ele usa FFmpeg internamente se necessário
          resource = createLocalResource(cleanPath);
        } else {
          throw new Error(`Arquivo não encontrado: ${cleanPath}`);
        }
      } else {
        console.log('🌐 Link Direto / MyInstants');
        resource = await resolveAndCreateDirectResource(soundUrl);
      }
    }

    if (!resource) throw new Error('Não foi possível gerar o áudio.');

    if (volume) resource.volume?.setVolume(Number(volume));

    player.stop(); // Parar atual antes de tocar novo
    player.play(resource);

    res.json({ success: true });

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
