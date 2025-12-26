import { Client, GatewayIntentBits } from 'discord.js';
import { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus, getVoiceConnection } from '@discordjs/voice';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { spawn } from 'child_process';
import { Readable } from 'stream';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import ffmpegPath from 'ffmpeg-static';

// Carregar variáveis de ambiente
dotenv.config();

// Configurar FFmpeg
if (ffmpegPath) {
  console.log(`🎥 FFmpeg configurado: ${ffmpegPath}`);
  process.env.FFMPEG_PATH = ffmpegPath;
} else {
  console.error('⚠️ FFmpeg não encontrado! O bot não vai conseguir tocar nada.');
}

console.log('🚀 [BOT v7.0] SOUNDBOARD EDITION - MYINSTANTS & UPLOADS ONLY');

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
  console.log(`🔗 Link do Site: https://put-input-out.vercel.app/`);
});

// Configuração do Express
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());
app.use(cors({ origin: '*' }));

// Estado global de conexões
const voiceConnections = new Map();
const audioPlayers = new Map();

// Configuração de Upload (Multer)
const soundsUploadDir = path.join(process.cwd(), 'sounds');
if (!fs.existsSync(soundsUploadDir)) {
  try {
    fs.mkdirSync(soundsUploadDir, { recursive: true });
  } catch (e) {
    console.error('Erro ao criar pasta de sons:', e);
  }
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
    else cb(new Error('Formato não suportado! Use MP3, WAV ou OGG.'));
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// --- FUNÇÕES AUXILIARES ---

// 1. Tocar arquivo local via FFmpeg
function ffmpegPcmFromPath(filePath) {
  console.log(`Local File Stream: ${filePath}`);
  const ffmpeg = spawn(ffmpegPath, [
    '-i', filePath,
    '-f', 's16le',
    '-ar', '48000',
    '-ac', '2',
    '-loglevel', 'error',
    'pipe:1'
  ]);

  ffmpeg.stderr.on('data', d => {
    console.log(`ffmpeg local err: ${d}`);
    fs.appendFileSync(path.join(process.cwd(), 'debug-output.txt'), `FFMPEG STDERR: ${d}\n`);
  });

  return createAudioResource(ffmpeg.stdout, { inlineVolume: true, inputType: 'raw' });
}

// 2. Tocar URL (MyInstants/Direct) via FFmpeg
function ffmpegPcmFromReadable(readable) {
  console.log(`Remote StreamPipe started...`);
  const ffmpeg = spawn(ffmpegPath, [
    '-i', 'pipe:0',
    '-f', 's16le',
    '-ar', '48000',
    '-ac', '2',
    '-loglevel', 'error',
    'pipe:1'
  ]);

  readable.pipe(ffmpeg.stdin);

  ffmpeg.stderr.on('data', d => console.log(`ffmpeg err: ${d}`));

  return createAudioResource(ffmpeg.stdout, { inlineVolume: true, inputType: 'raw' });
}

// 3. Resolver link MyInstants
async function resolveMyInstantsUrl(url) {
  if (!url.includes('myinstants.com')) return url;

  console.log(`🔎 Analisando MyInstants: ${url}`);
  try {
    // User-Agent é importante pois alguns sites bloqueiam requests sem ele
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    const html = await response.text();

    // Procura o padrão comum de MP3 do MyInstants
    const match = html.match(/https?:\/\/www\.myinstants\.com\/media\/sounds\/[^"']+\.mp3/i) ||
      html.match(/\/media\/sounds\/[^"']+\.mp3/i);

    if (match) {
      let mp3 = match[0];
      if (mp3.startsWith('/')) mp3 = 'https://www.myinstants.com' + mp3;
      console.log(`✅ MP3 Extraído: ${mp3}`);
      return mp3;
    }
    console.warn('⚠️ Não achei o .mp3 no código fonte da página.');
    return url;
  } catch (e) {
    console.error('❌ Erro ao ler MyInstants:', e.message);
    return url;
  }
}

// 4. Conectar Voice
async function connectToVoiceChannel(guildId, voiceChannelId) {
  const guild = client.guilds.cache.get(guildId);
  if (!guild) throw new Error('Servidor não encontrado');

  const voiceChannel = guild.channels.cache.get(voiceChannelId);
  if (!voiceChannel) throw new Error('Canal não encontrado');

  let connection = getVoiceConnection(guildId);

  if (!connection) {
    connection = joinVoiceChannel({
      channelId: voiceChannelId,
      guildId: guildId,
      adapterCreator: guild.voiceAdapterCreator,
      selfDeaf: false,
    });

    connection.on(VoiceConnectionStatus.Disconnected, () => {
      voiceConnections.delete(guildId);
      audioPlayers.delete(guildId);
    });
    voiceConnections.set(guildId, connection);
  }

  let player = audioPlayers.get(guildId);
  if (!player) {
    player = createAudioPlayer();
    player.on('error', e => console.error('Erro no Player:', e));
    connection.subscribe(player);
    audioPlayers.set(guildId, player);
  }

  return { connection, player };
}


// --- ENDPOINTS ---

app.get('/health', (req, res) => res.json({ status: 'ok', v: '7.0-soundboard' }));

// Listar sons
app.get('/api/sounds', (req, res) => {
  try {
    const p = path.join(process.cwd(), '../web/sounds.json');
    if (fs.existsSync(p)) res.json(JSON.parse(fs.readFileSync(p, 'utf8')));
    else res.json([]);
  } catch (e) { res.status(500).json([]); }
});

// Update (Rename)
app.post('/api/sounds/update', (req, res) => {
  const { url, newName } = req.body;
  const p = path.join(process.cwd(), '../web/sounds.json');
  try {
    const sounds = JSON.parse(fs.readFileSync(p, 'utf8'));
    const idx = sounds.findIndex(s => s.url === url);
    if (idx !== -1) {
      sounds[idx].name = newName;
      fs.writeFileSync(p, JSON.stringify(sounds, null, 2));
      return res.json({ success: true });
    }
  } catch (e) { }
  res.status(500).json({ error: 'Erro ao atualizar' });
});

// Delete
app.post('/api/sounds/delete', (req, res) => {
  const { url, password } = req.body;
  if (password !== 'admindelete') return res.status(403).json({ error: 'Senha inválida' });

  const p = path.join(process.cwd(), '../web/sounds.json');
  try {
    let sounds = JSON.parse(fs.readFileSync(p, 'utf8'));
    const initialLen = sounds.length;
    sounds = sounds.filter(s => s.url !== url);

    if (sounds.length !== initialLen) {
      fs.writeFileSync(p, JSON.stringify(sounds, null, 2));

      // Deletar arquivo fisico se for local
      if (url.includes(path.join('bot', 'sounds')) && fs.existsSync(url)) {
        try { fs.unlinkSync(url); } catch (e) { console.error('Erro deletando arquivo:', e); }
      }
      return res.json({ success: true });
    }
    return res.status(404).json({ error: 'Som não encontrado' });
  } catch (e) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Upload
app.post('/api/sounds/upload', upload.single('audio'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Sem arquivo' });

  const soundName = req.body.name || path.parse(req.file.originalname).name;
  const p = path.join(process.cwd(), '../web/sounds.json');

  try {
    let sounds = [];
    if (fs.existsSync(p)) sounds = JSON.parse(fs.readFileSync(p, 'utf8'));

    const newSound = { name: soundName, url: req.file.path };
    sounds.push(newSound);
    fs.writeFileSync(p, JSON.stringify(sounds, null, 2));

    console.log(`📥 Upload: ${soundName}`);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PLAY (O Principal)
app.post('/play', async (req, res) => {
  const { guildId, voiceChannelId, soundUrl, volume } = req.body;
  const logMsg = `[${new Date().toISOString()}] Play Request: ${soundUrl} (Local check...)\n`;
  fs.appendFileSync(path.join(process.cwd(), 'debug-output.txt'), logMsg);
  console.log(`🎵 Play Request: ${soundUrl}`);

  if (!guildId || !voiceChannelId || !soundUrl) return res.status(400).json({ error: 'Missing params' });

  // DEV MODE bypass
  if (process.env.DISCORD_TOKEN === 'seu_discord_bot_token_aqui') return res.json({ ok: true, dev: true });

  try {
    const { player } = await connectToVoiceChannel(guildId, voiceChannelId);

    // 1. Resolver link (MyInstants -> MP3 URL)
    const finalUrl = await resolveMyInstantsUrl(soundUrl);
    let resource;

    // 2. Criar Resource de Áudio
    const isLocal = (finalUrl.includes(':\\') || finalUrl.startsWith('/')) && !finalUrl.startsWith('http');
    fs.appendFileSync(path.join(process.cwd(), 'debug-output.txt'), `FinalURL: ${finalUrl}, isLocal: ${isLocal}\n`);

    if (isLocal) {
      // Arquivo Local
      let cleanPath = finalUrl.replace(/^"|"$/g, '');
      if (!fs.existsSync(cleanPath)) {
        // Tentar corrigir path relativo se necessário
        cleanPath = path.resolve(cleanPath);
      }
      fs.appendFileSync(path.join(process.cwd(), 'debug-output.txt'), `CleanPath: ${cleanPath}, Exists: ${fs.existsSync(cleanPath)}\n`);

      if (fs.existsSync(cleanPath)) {
        resource = ffmpegPcmFromPath(cleanPath);
      } else {
        throw new Error(`Arquivo local não existe: ${cleanPath}`);
      }
    } else {
      // HTTP URL (MP3 direto ou extraido)
      const response = await fetch(finalUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      });
      if (!response.ok) throw new Error(`Erro ao baixar áudio: ${response.statusText}`);
      resource = ffmpegPcmFromReadable(Readable.fromWeb(response.body));
    }

    if (resource) {
      if (volume) resource.volume?.setVolume(volume);
      player.play(resource);
      console.log('▶️ Tocando...');
      fs.appendFileSync(path.join(process.cwd(), 'debug-output.txt'), `Player started playing.\n`);
      res.json({ ok: true });
    } else {
      throw new Error('Falha ao criar resource de áudio');
    }

  } catch (error) {
    console.error('❌ Erro no Play:', error.message);
    fs.appendFileSync(path.join(process.cwd(), 'debug-output.txt'), `ERROR: ${error.message}\n`);
    res.status(500).json({ error: error.message });
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

    if (args[0] === 'site') {
      return message.reply({
        embeds: [{
          title: "🌐 Como usar o Soundboard Web",
          description: "1. Entre em https://put-input-out.vercel.app/\n2. Cole as IDs do Servidor e Canal nos campos de configuração.\n3. Clique em **Testar Conexão**.\n4. Quando estiver verde, basta clicar nos botões dos sons!",
          color: 0x5865F2,
          fields: [
            { name: "Como pegar as IDs?", value: "Ative o 'Modo Desenvolvedor' no Discord (Configs > Avançado) e clique com o botão direito no Servidor ou Canal para copiar a ID." }
          ]
        }]
      });
    }

    message.reply({
      content: `📌 **Central de Ajuda - PutIn PutOut:**\n\n▶️ \`!play <nome>\` - Toca um som da biblioteca\n⏹️ \`!stop\` - Para o áudio atual\n📚 \`!help sons\` - Lista de todos os áudios\n🌐 \`!help site\` - Como configurar pelo navegador\n\n✨ **Dica:** Você também pode fazer upload de sons novos direto pelo site!`
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
