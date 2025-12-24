import { Client, GatewayIntentBits } from 'discord.js';
import { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus, getVoiceConnection } from '@discordjs/voice';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import SpotifyWebApi from 'spotify-web-api-node';
import { spawn } from 'child_process';
import { Readable } from 'stream';
import path from 'path';
import fs from 'fs';
import play from 'play-dl';

import ffmpegPath from 'ffmpeg-static';

// Carregar variáveis de ambiente
dotenv.config();

// Log para verificar se o código atualizado foi aplicado
console.log('🚀 [BOT v6] SISTEMA DE ÁUDIO RESTRUTURADO');
console.log('🎵 Suporte Spotify: FULL (Tracks, Albums, Playlists)');
console.log('📡 O Logger de requisições está ATIVO!');

// Configuração do bot Discord
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Inicializar bot Discord
client.once('ready', async () => {
  console.log(`✅ BOT ONLINE: ${client.user.tag}`);
  console.log(`🔗 Link do Site: https://put-input-out.vercel.app/`);
  console.log(`⚙️  Aguardando comandos...`);
});

// Configuração do Spotify (opcional)
let spotifyApi = null;
if (process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET) {
  spotifyApi = new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET
  });

  // Configurar play-dl para usar as mesmas credenciais do Spotify
  play.setToken({
    spotify: {
      client_id: process.env.SPOTIFY_CLIENT_ID,
      client_secret: process.env.SPOTIFY_CLIENT_SECRET,
      market: 'BR'
    }
  }).catch(err => console.error('⚠️ Erro ao configurar play-dl/Spotify:', err.message));
}

// Configuração do Express
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning']
}));

// Middleware de Log para Diagnóstico
app.use((req, res, next) => {
  console.log(`📡 [${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  if (req.method === 'POST') {
    console.log('📦 Body:', JSON.stringify(req.body).substring(0, 100) + '...');
  }
  next();
});

// Armazenar conexões de voz por guild
const voiceConnections = new Map();
const audioPlayers = new Map();

// Função para converter arquivo local para PCM via ffmpeg
function ffmpegPcmFromPath(filePath) {
  console.log(`🎬 Iniciando ffmpeg para arquivo: ${filePath}`);
  const ffmpeg = spawn(ffmpegPath, [
    '-i', filePath,
    '-f', 's16le',
    '-ar', '48000',
    '-ac', '2',
    '-loglevel', 'error',
    'pipe:1'
  ]);

  const resource = createAudioResource(ffmpeg.stdout, {
    inlineVolume: true,
    inputType: 'raw'
  });

  ffmpeg.on('error', err => console.error('❌ Erro no ffmpeg (Path):', err));
  return resource;
}

function ffmpegPcmFromReadable(readable) {
  const ffmpeg = spawn(ffmpegPath, [
    '-i', 'pipe:0',
    '-f', 's16le',
    '-ar', '48000',
    '-ac', '2',
    '-loglevel', 'error',
    'pipe:1'
  ]);

  readable.pipe(ffmpeg.stdin);

  const resource = createAudioResource(ffmpeg.stdout, {
    inlineVolume: true,
    inputType: 'raw'
  });

  // Log de erros do ffmpeg
  ffmpeg.on('error', err => console.error('❌ Erro no processo ffmpeg:', err));
  ffmpeg.stderr.on('data', data => console.log(`ffmpeg info: ${data}`));

  return resource;
}

function isSpotifyUrl(url) {
  return url.includes('spotify.com');
}

// Função para obter preview URL do Spotify
async function getSpotifyPreviewUrl(trackId) {
  if (!spotifyApi) {
    throw new Error('Credenciais do Spotify não configuradas');
  }

  try {
    // Obter token de acesso
    const data = await spotifyApi.clientCredentialsGrant();
    spotifyApi.setAccessToken(data.body.access_token);

    // Obter informações do track
    const track = await spotifyApi.getTrack(trackId);
    return track.body.preview_url;
  } catch (error) {
    console.error('Erro ao obter preview do Spotify:', error);
    throw new Error('Falha ao obter preview do Spotify');
  }
}

// Função para conectar ao canal de voz
async function connectToVoiceChannel(guildId, voiceChannelId) {
  try {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      throw new Error('Servidor não encontrado');
    }

    const voiceChannel = guild.channels.cache.get(voiceChannelId);
    if (!voiceChannel || voiceChannel.type !== 2) { // 2 = GUILD_VOICE
      throw new Error('Canal de voz não encontrado');
    }

    // Verificar se já existe conexão
    let connection = getVoiceConnection(guildId);

    if (!connection) {
      connection = joinVoiceChannel({
        channelId: voiceChannelId,
        guildId: guildId,
        adapterCreator: guild.voiceAdapterCreator,
        selfDeaf: false,
        selfMute: false
      });

      // Configurar handlers de conexão
      connection.on(VoiceConnectionStatus.Ready, () => {
        console.log(`Conectado ao canal de voz: ${voiceChannel.name}`);
      });

      connection.on(VoiceConnectionStatus.Disconnected, () => {
        console.log(`Desconectado do canal de voz: ${voiceChannel.name}`);
        voiceConnections.delete(guildId);
        audioPlayers.delete(guildId);
      });

      voiceConnections.set(guildId, connection);
    }

    // Criar ou reutilizar player de áudio
    let player = audioPlayers.get(guildId);
    if (!player) {
      player = createAudioPlayer();

      player.on(AudioPlayerStatus.Playing, () => {
        console.log('▶️ Player: Começou a tocar!');
      });

      player.on(AudioPlayerStatus.Buffering, () => {
        console.log('⏳ Player: Carregando áudio (Buffering)...');
      });

      player.on('error', error => {
        console.error('❌ Player: Erro crítico:', error.message);
        console.error('Detalhes do recurso:', error.resource.metadata);
      });

      connection.subscribe(player);
      audioPlayers.set(guildId, player);
    }

    return { connection, player };
  } catch (error) {
    console.error('Erro ao conectar ao canal de voz:', error);
    throw error;
  }
}

// Endpoint de health check
app.get('/health', (req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

// Endpoint para obter a lista de sons
app.get('/api/sounds', (req, res) => {
  try {
    const soundsPath = path.join(process.cwd(), '../web/sounds.json');
    if (fs.existsSync(soundsPath)) {
      const data = fs.readFileSync(soundsPath, 'utf8');
      res.json(JSON.parse(data));
    } else {
      res.json([]);
    }
  } catch (error) {
    res.status(500).json({ error: 'Erro ao ler sons' });
  }
});

// Endpoint para atualizar um som (editar nome)
app.post('/api/sounds/update', (req, res) => {
  const { oldName, newName, url } = req.body;

  try {
    const soundsPath = path.join(process.cwd(), '../web/sounds.json');
    let sounds = [];
    if (fs.existsSync(soundsPath)) {
      sounds = JSON.parse(fs.readFileSync(soundsPath, 'utf8'));
    }

    const index = sounds.findIndex(s => s.url === url);
    if (index !== -1) {
      sounds[index].name = newName;
      fs.writeFileSync(soundsPath, JSON.stringify(sounds, null, 2));
      res.json({ success: true, sounds });
    } else {
      res.status(404).json({ error: 'Som não encontrado' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Erro ao salvar som' });
  }
});

// Endpoint principal para tocar áudio
app.post('/play', async (req, res) => {
  try {
    const { guildId, voiceChannelId, soundUrl, volume } = req.body;

    console.log(`🎵 Requisição de áudio recebida: ${soundUrl}`);
    // Validação
    if (!guildId || !voiceChannelId || !soundUrl) {
      return res.status(400).json({ error: 'Parâmetros obrigatórios: guildId, voiceChannelId, soundUrl' });
    }

    // Modo de desenvolvimento - simular resposta sem conectar ao Discord
    if (!process.env.DISCORD_TOKEN || process.env.DISCORD_TOKEN === 'seu_discord_bot_token_aqui') {
      console.log('🔧 Modo de desenvolvimento - simulando resposta');
      return res.json({
        ok: true,
        source: 'DEV_MODE',
        message: 'Modo de desenvolvimento - áudio simulado com sucesso'
      });
    }

    // Conectar ao canal de voz
    const { connection, player } = await connectToVoiceChannel(guildId, voiceChannelId);

    // Determinar tipo de stream e criar resource
    let audioResource;
    let source = 'DIRECT';

    try {
      const spCheck = await play.validate(soundUrl);

      if (spCheck && spCheck.startsWith('sp_')) {
        console.log(`🎵 Processando Spotify (${spCheck}): ${soundUrl}`);

        if (play.is_expired()) {
          await play.refreshToken();
        }

        const spData = await play.spotify(soundUrl);
        let trackToPlay = null;

        if (spData.type === 'track') {
          trackToPlay = spData;
          source = 'SPOTIFY_TRACK';
        } else if (spData.type === 'album' || spData.type === 'playlist') {
          trackToPlay = spData.tracks[0];
          source = `SPOTIFY_${spData.type.toUpperCase()} (Primeira faixa)`;
        }

        if (trackToPlay) {
          console.log(`🔍 Buscando áudio para: ${trackToPlay.name}`);
          const stream = await play.stream(trackToPlay.url, {
            quality: 2,
            seek: 0
          });

          audioResource = createAudioResource(stream.stream, {
            inputType: stream.type,
            inlineVolume: true
          });
        }
      } else if ((soundUrl.includes(':\\') || soundUrl.includes('/') || soundUrl.startsWith('.')) && !soundUrl.startsWith('http')) {
        // Arquivo local
        const cleanPath = soundUrl.replace(/^\"|\"$/g, '');
        console.log(`🎵 Processando arquivo local: ${cleanPath}`);
        if (fs.existsSync(cleanPath)) {
          audioResource = ffmpegPcmFromPath(cleanPath);
          source = 'LOCAL_FILE';
        } else {
          // Tentar no diretório de sons fixo
          const fixedPath = path.join(process.cwd(), '../bot/sounds', path.basename(cleanPath));
          if (fs.existsSync(fixedPath)) {
            audioResource = ffmpegPcmFromPath(fixedPath);
            source = 'LOCAL_FILE_STATIC';
          } else {
            throw new Error(`Arquivo local não encontrado: ${cleanPath}`);
          }
        }
      } else {
        // URL direta ou YouTube (play-dl cuida disso agora)
        console.log(`🎵 Processando link genérico via play-dl: ${soundUrl}`);
        const stream = await play.stream(soundUrl).catch(() => null);

        if (stream) {
          audioResource = createAudioResource(stream.stream, {
            inputType: stream.type,
            inlineVolume: true
          });
          source = 'EXTERNAL_STREAM';
        } else {
          // Fallback para fetch direto se play-dl falhar em links diretos de áudio
          console.log('⚠️ play-dl não reconheceu o link, tentando fetch direto...');
          const response = await fetch(soundUrl);
          if (!response.ok) throw new Error('Falha ao acessar URL de áudio');
          audioResource = ffmpegPcmFromReadable(Readable.fromWeb(response.body));
          source = 'DIRECT_FETCH';
        }
      }

      // Configurar volume
      if (volume !== undefined && volume >= 0 && volume <= 1) {
        audioResource.volume?.setVolume(volume);
      }

      // Tocar áudio
      player.play(audioResource);

      // Log de sucesso
      console.log(`✅ Reproduzindo áudio - Fonte: ${source}, Volume: ${volume || 1}`);

      // Handler para quando o áudio terminar
      player.once(AudioPlayerStatus.Idle, () => {
        console.log(`🎵 Áudio finalizado - Fonte: ${source}`);
      });

      res.json({
        ok: true,
        source: source,
        message: 'Áudio iniciado com sucesso'
      });

    } catch (streamError) {
      console.error('Erro ao processar áudio:', streamError.message);

      // Salvar erro em arquivo para debug
      const logMsg = `${new Date().toISOString()} - [${source}] Erro: ${streamError.message}\nStack: ${streamError.stack}\n\n`;
      fs.appendFileSync('bot_error.log', logMsg);

      res.status(400).json({
        error: streamError.message,
        source: source
      });
    }

  } catch (error) {
    console.error('Erro no endpoint /play:', error);
    fs.appendFileSync('bot_error.log', `${new Date().toISOString()} - [PLAY_ENDPOINT] Erro: ${error.message}\n`);

    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error.message
    });
  }
});

// Comandos do Discord
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.content.startsWith('!')) return;

  const args = message.content.slice(1).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  if (command === 'help') {
    if (args[0] === 'sons') {
      try {
        const soundsPath = path.join(process.cwd(), '../web/sounds.json');
        if (fs.existsSync(soundsPath)) {
          const soundsData = JSON.parse(fs.readFileSync(soundsPath, 'utf8'));
          const soundNames = soundsData.map(s => `• ${s.name}`).join('\n');
          const chunks = soundNames.match(/[\s\S]{1,1900}/g) || [];

          await message.reply(`🎵 **Sons Disponíveis:**`);
          for (const chunk of chunks) {
            await message.channel.send(`\`\`\`\n${chunk}\n\`\`\``);
          }
        }
      } catch (err) {
        message.reply('❌ Erro ao listar sons.');
      }
      return;
    }

    message.reply({
      content: `📌 **Comandos do Bot:**\n\n▶️ \`!play <nome ou url>\` - Toca um som ou URL\n⏹️ \`!stop\` - Para a reprodução atual\n📚 \`!help sons\` - Lista todos os sons da biblioteca`
    });
  }

  if (command === 'stop') {
    const connection = getVoiceConnection(message.guildId);
    if (connection) {
      const player = audioPlayers.get(message.guildId);
      if (player) player.stop();
      message.reply('⏹️ Reprodução parada.');
    }
  }

  if (command === 'play') {
    const query = args.join(' ');
    if (!query) return message.reply('❌ Diga o nome do som ou cole um link.');

    message.reply(`🎵 Buscando som: **${query}**...`);

    try {
      const soundsPath = path.join(process.cwd(), '../web/sounds.json');
      const soundsData = JSON.parse(fs.readFileSync(soundsPath, 'utf8'));
      const foundSound = soundsData.find(s => s.name.toLowerCase().includes(query.toLowerCase()));
      const soundUrl = foundSound ? foundSound.url : query;
      const voiceChannelId = '1141073147840430160';

      const response = await fetch(`http://localhost:${PORT}/play`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret: process.env.SHARED_SECRET,
          guildId: message.guildId,
          voiceChannelId: voiceChannelId,
          soundUrl: soundUrl,
          volume: 1
        })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Erro no bot');

      message.channel.send(`✅ Tocando: **${foundSound ? foundSound.name : query}**`);
    } catch (err) {
      message.channel.send(`❌ Erro ao tocar: ${err.message}`);
    }
  }
});

// Login do bot
if (process.env.DISCORD_TOKEN) {
  client.login(process.env.DISCORD_TOKEN);
}

// Iniciar servidor Express
app.listen(PORT, () => {
  console.log(`🚀 [BOT v5] Backend pronto na porta ${PORT}`);
  console.log(`🌍 TESTE AGORA: https://saltily-unprovident-xavier.ngrok-free.dev/health`);
});

// Tratamento de erros
process.on('unhandledRejection', (error) => console.error('Unhandled:', error));
process.on('uncaughtException', (error) => console.error('Uncaught:', error));
