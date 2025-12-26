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
function createLocalResource(filePath) {
  console.log(`💿 Criando resource local (FFmpeg): ${filePath}`);

  const ffmpeg = spawn(ffmpegPath, [
    '-i', filePath,
    '-f', 'opus',
    '-c:a', 'libopus',
    '-ac', '2',
    '-ar', '48000',
    'pipe:1'
  ]);

  ffmpeg.stderr.on('data', d => { }); // Ocultar logs excessivos

  return createAudioResource(ffmpeg.stdout, {
    inputType: StreamType.OggOpus,
    inlineVolume: true
  });
}

// 2. Tocar Stream (YouTube/Spotify via play-dl)
async function createStreamResource(url) {
  const type = await play.validate(url);
  let streamInfo;

  try {
    if (type === 'yt_video') {
      streamInfo = await play.stream(url, { discordPlayerCompatibility: true });
    } else if (type === 'sp_track') {
      if (play.is_expired()) await play.refreshToken();
      streamInfo = await play.stream(url, { discordPlayerCompatibility: true });
    } else if (type === 'sp_playlist') {
      const playlist = await play.spotify(url);
      const firstTrack = playlist.fetched_tracks.get('1');
      streamInfo = await play.stream(firstTrack.url, { discordPlayerCompatibility: true });
    }
  } catch (e) {
    console.error('Erro play-dl:', e);
    return null;
  }

  if (streamInfo) {
    // play-dl streams are already compatible (opus-ish), but often specifying StreamType helps.
    // Usually inputType: streamInfo.type works best.
    return createAudioResource(streamInfo.stream, {
      inputType: streamInfo.type,
      inlineVolume: true
    });
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
    connection = joinVoiceChannel({
      channelId: channelId,
      guildId: guildId,
      adapterCreator: adapterCreator
    });

    connection.on(VoiceConnectionStatus.Disconnected, () => {
      try { connection.destroy(); } catch (e) { }
      voiceConnections.delete(guildId);
      audioPlayers.delete(guildId);
    });
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

app.listen(PORT, () => {
  console.log(`🔊 SERVER AUDIO ONLINE NA PORTA ${PORT}`);
});
