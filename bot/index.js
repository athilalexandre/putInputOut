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
    GatewayIntentBits.GuildMembers
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
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));

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
      highWaterMark: 1 << 25
    });
  } catch (error) {
    console.error('Erro ao obter stream do YouTube:', error);
    throw new Error('Falha ao processar vídeo do YouTube');
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

// Endpoint principal para tocar áudio
app.post('/play', async (req, res) => {
  try {
    const { secret, guildId, voiceChannelId, soundUrl, volume } = req.body;

    // Validação
    if (!secret || secret !== process.env.SHARED_SECRET) {
      return res.status(401).json({ error: 'Secret inválido' });
    }

    if (!guildId || !voiceChannelId || !soundUrl) {
      return res.status(400).json({ error: 'Parâmetros obrigatórios: guildId, voiceChannelId, soundUrl' });
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
      } else {
        // URL direta de áudio
        console.log(`🎵 Processando áudio direto: ${soundUrl}`);
        const response = await fetch(soundUrl);
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
client.once('ready', () => {
  console.log(`🤖 Bot ${client.user.tag} está online!`);
  console.log(`📡 Servidor Express rodando na porta ${PORT}`);
});

// Login do bot
client.login(process.env.DISCORD_TOKEN);

// Iniciar servidor Express
app.listen(PORT, () => {
  console.log(`🚀 Servidor Express iniciado na porta ${PORT}`);
});

// Tratamento de erros não capturados
process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection:', error);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});
