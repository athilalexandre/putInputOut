import { Client, GatewayIntentBits } from 'discord.js';
import { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus, getVoiceConnection } from '@discordjs/voice';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import ytdl from 'ytdl-core';
import ytsr from 'ytsr';
import SpotifyWebApi from 'spotify-web-api-node';
import { spawn } from 'child_process';
import { Readable } from 'stream';

// Carregar variáveis de ambiente
dotenv.config();

// Log para verificar se o código atualizado foi aplicado
console.log('🔄 Bot iniciado com código atualizado - sem @discordjs/opus');

// Configuração do bot Discord
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Configuração do Spotify (opcional)
let spotifyApi = null;
if (process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET) {
  spotifyApi = new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET
  });
}

// Configuração do Express
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors()); // Permitir todas as origens para facilitar com Ngrok

// Armazenar conexões de voz por guild
const voiceConnections = new Map();
const audioPlayers = new Map();

// Função para converter stream para PCM via ffmpeg
function ffmpegPcmFromReadable(readable) {
  const ffmpeg = spawn('ffmpeg', [
    '-i', 'pipe:0',
    '-f', 's16le',
    '-ar', '48000',
    '-ac', '2',
    '-loglevel', 'error',
    'pipe:1'
  ]);

  readable.pipe(ffmpeg.stdin);

  return createAudioResource(ffmpeg.stdout, {
    inlineVolume: true,
    inputType: 'raw'
  });
}

// Função para detectar tipo de URL
function isYouTube(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname === 'youtube.com' || urlObj.hostname === 'www.youtube.com' || urlObj.hostname === 'youtu.be';
  } catch {
    return false;
  }
}

function isSpotifyTrack(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname === 'open.spotify.com' && urlObj.pathname.startsWith('/track/');
  } catch {
    return false;
  }
}

// Função para obter stream do YouTube
async function getYouTubeReadable(url) {
  try {
    const quality = process.env.YOUTUBE_AUDIO_QUALITY || 'highestaudio';
    return ytdl(url, {
      filter: 'audioonly',
      quality: quality,
      highWaterMark: 1 << 24,
      dlChunkSize: 1024 * 1024,
      requestOptions: {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
          'Accept': '*/*',
          'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
          'Sec-Fetch-Mode': 'no-cors',
          'Sec-Fetch-Dest': 'video',
          'Referer': 'https://www.youtube.com/',
        }
      }
    });
  } catch (error) {
    console.error('Erro ao obter stream do YouTube:', error);
    throw new Error('Falha ao processar vídeo do YouTube (403/Forbidden)');
  }
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

// Função para buscar no YouTube por artista e título
async function searchYouTubeByArtistTitle(artist, title) {
  try {
    const query = `${artist} - ${title}`;
    const results = await ytsr(query, { limit: 5 });

    // Filtrar resultados válidos (ignorar lives longas)
    const validResults = results.items.filter(item =>
      item.type === 'video' &&
      item.duration &&
      item.duration < 600 // Menos de 10 minutos
    );

    if (validResults.length === 0) {
      throw new Error('Nenhum resultado válido encontrado no YouTube');
    }

    return validResults[0].url;
  } catch (error) {
    console.error('Erro na busca do YouTube:', error);
    throw new Error('Falha ao buscar equivalente no YouTube');
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
    const fs = require('fs');
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
    const fs = require('fs');
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
      if (isYouTube(soundUrl)) {
        console.log(`🎵 Processando YouTube: ${soundUrl}`);
        const youtubeStream = await getYouTubeReadable(soundUrl);
        audioResource = ffmpegPcmFromReadable(youtubeStream);
        source = 'YT';
      } else if (isSpotifyTrack(soundUrl)) {
        console.log(`🎵 Processando Spotify: ${soundUrl}`);
        const trackId = soundUrl.split('/track/')[1]?.split('?')[0];

        try {
          // Tentar preview do Spotify
          const previewUrl = await getSpotifyPreviewUrl(trackId);
          if (previewUrl) {
            console.log('✅ Preview do Spotify disponível');
            audioResource = ffmpegPcmFromReadable(Readable.fromWeb(fetch(previewUrl).then(r => r.body)));
            source = 'SPOTIFY_PREVIEW';
          } else {
            throw new Error('Preview não disponível');
          }
        } catch (previewError) {
          console.log('⚠️ Preview do Spotify indisponível, buscando no YouTube...');

          // Fallback para YouTube
          const track = await spotifyApi.getTrack(trackId);
          const artist = track.body.artists[0]?.name;
          const title = track.body.name;

          const youtubeUrl = await searchYouTubeByArtistTitle(artist, title);
          const youtubeStream = await getYouTubeReadable(youtubeUrl);
          audioResource = ffmpegPcmFromReadable(youtubeStream);
          source = 'SPOTIFY_FALLBACK_YT';
        }
      } else if (soundUrl.includes(':\\') || require('fs').existsSync(soundUrl)) {
        // Arquivo local
        const fs = require('fs');
        const cleanPath = soundUrl.replace(/^\"|\"$/g, '');
        console.log(`🎵 Processando arquivo local: ${cleanPath}`);
        if (fs.existsSync(cleanPath)) {
          const localStream = fs.createReadStream(cleanPath);
          audioResource = ffmpegPcmFromReadable(localStream);
          source = 'LOCAL_FILE';
        } else {
          throw new Error('Arquivo local não encontrado');
        }
      } else {
        // URL direta de áudio
        console.log(`🎵 Processando áudio direto: ${soundUrl}`);
        const response = await fetch(soundUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'Referer': 'https://www.soundjay.com/',
          }
        });
        if (!response.ok) {
          throw new Error('Falha ao acessar URL de áudio');
        }
        const audioStream = Readable.fromWeb(response.body);
        audioResource = ffmpegPcmFromReadable(audioStream);
        source = 'DIRECT';
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
        message: source === 'SPOTIFY_FALLBACK_YT'
          ? 'Sem preview no Spotify — reproduzindo equivalente do YouTube'
          : 'Áudio iniciado com sucesso'
      });

    } catch (streamError) {
      console.error('Erro ao processar stream:', streamError);
      res.status(500).json({
        error: 'Falha ao processar áudio',
        details: streamError.message,
        source: source
      });
    }

  } catch (error) {
    console.error('Erro no endpoint /play:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error.message
    });
  }
});

// Inicializar bot Discord
client.once('ready', async () => {
  console.log(`🤖 Bot ${client.user.tag} está online!`);
  console.log(`📡 Servidor Express rodando na porta ${PORT}`);

  try {
    const channelId = '1368286913651544075';
    const channel = await client.channels.fetch(channelId);
    if (channel && channel.isTextBased()) {
      channel.send({
        content: `🎧 **O Bot de Sons ${client.user.username} está online!**\n\n📌 **Como usar:**\n- Clique no link do Soundboard no site\n- Use \`!help\` aqui no Discord para comandos\n- Ou use \`!play <nome do som>\` (ex: \`!play ratinho\`)\n\n⚠️ *Nota: O som será ouvido apenas para quem estiver no canal de voz "Mansão".*`
      });
    }
  } catch (err) {
    console.log('⚠️ Erro ao enviar mensagem de boas-vindas:', err.message);
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
        const soundsPath = require('path').join(process.cwd(), '../web/sounds.json');
        const fs = require('fs');
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
      content: `📌 **Comandos do Bot:**\n\n▶️ \`!play <nome ou url>\` - Toca um som ou URL\n⏹️ \`!stop\` - Para a reprodução atual\n📚 \`!help sons\` - Lista todos os sons da biblioteca\n🌐 **Site:** http://localhost:3000`
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
      const soundsPath = require('path').join(process.cwd(), '../web/sounds.json');
      const soundsData = JSON.parse(require('fs').readFileSync(soundsPath, 'utf8'));
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

// Login do bot (opcional para desenvolvimento)
if (process.env.DISCORD_TOKEN && process.env.DISCORD_TOKEN !== 'seu_discord_bot_token_aqui') {
  client.login(process.env.DISCORD_TOKEN);
} else {
  console.log('⚠️ Token do Discord não configurado - modo de desenvolvimento');
}

// Iniciar servidor Express
const server = app.listen(PORT, () => {
  console.log(`🚀 Servidor Express iniciado na porta ${PORT}`);
});

// Manter o processo rodando
process.on('SIGINT', () => {
  console.log('🛑 Encerrando servidor...');
  server.close(() => {
    console.log('✅ Servidor encerrado');
    process.exit(0);
  });
});

// Tratamento de erros não capturados
process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection:', error);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});
