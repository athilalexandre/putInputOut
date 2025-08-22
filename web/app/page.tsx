'use client'

import { useState, useEffect } from 'react'
import sounds from '../sounds.json'

interface Sound {
  name: string
  url: string
}

interface PlayResponse {
  ok: boolean
  source?: string
  message?: string
  error?: string
  details?: string
}

export default function Home() {
  // Estados para configuração do Discord
  const [guildId, setGuildId] = useState('')
  const [voiceChannelId, setVoiceChannelId] = useState('')
  const [volume, setVolume] = useState(1)
  
  // Estados para link rápido
  const [quickLink, setQuickLink] = useState('')
  
  // Estados para busca
  const [searchTerm, setSearchTerm] = useState('')
  
  // Estados de UI
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'connected' | 'error'>('idle')

  // Carregar configurações do localStorage
  useEffect(() => {
    const savedGuildId = localStorage.getItem('discord_guildId')
    const savedVoiceChannelId = localStorage.getItem('discord_voiceChannelId')
    const savedVolume = localStorage.getItem('discord_volume')
    const savedQuickLink = localStorage.getItem('discord_quickLink')

    if (savedGuildId) setGuildId(savedGuildId)
    if (savedVoiceChannelId) setVoiceChannelId(savedVoiceChannelId)
    if (savedVolume) setVolume(parseFloat(savedVolume))
    if (savedQuickLink) setQuickLink(savedQuickLink)
  }, [])

  // Salvar configurações no localStorage
  const saveToLocalStorage = (key: string, value: string | number) => {
    localStorage.setItem(`discord_${key}`, value.toString())
  }

  // Testar conexão
  const testConnection = async () => {
    if (!guildId || !voiceChannelId) {
      setStatus({ type: 'error', message: 'Configure Guild ID e Voice Channel ID primeiro' })
      return
    }

    setConnectionStatus('testing')
    setStatus({ type: 'info', message: 'Testando conexão...' })

    try {
      const response = await fetch('/api/play', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          soundUrl: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav',
          guildId,
          voiceChannelId,
          volume: 0.5
        })
      })

      if (response.ok) {
        setConnectionStatus('connected')
        setStatus({ type: 'success', message: '✅ Conexão testada com sucesso! Bot conectado ao canal de voz.' })
      } else {
        const error = await response.json()
        setConnectionStatus('error')
        setStatus({ type: 'error', message: `❌ Erro na conexão: ${error.error || 'Erro desconhecido'}` })
      }
    } catch (error) {
      setConnectionStatus('error')
      setStatus({ type: 'error', message: '❌ Erro ao testar conexão. Verifique se o bot está rodando.' })
    }
  }

  // Tocar som
  const playSound = async (soundUrl: string, soundName: string) => {
    if (!guildId || !voiceChannelId) {
      setStatus({ type: 'error', message: 'Configure Guild ID e Voice Channel ID primeiro' })
      return
    }

    setIsLoading(true)
    setStatus({ type: 'info', message: `🎵 Tocando: ${soundName}...` })

    try {
      const response = await fetch('/api/play', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          soundUrl,
          guildId,
          voiceChannelId,
          volume
        })
      })

      const result: PlayResponse = await response.json()

      if (response.ok && result.ok) {
        let message = `✅ ${soundName} iniciado!`
        
        if (result.source === 'SPOTIFY_FALLBACK_YT') {
          message += ' (Sem preview no Spotify — reproduzindo equivalente do YouTube)'
        } else if (result.source === 'YT') {
          message += ' (YouTube)'
        } else if (result.source === 'SPOTIFY_PREVIEW') {
          message += ' (Spotify Preview)'
        } else if (result.source === 'DIRECT') {
          message += ' (Áudio direto)'
        }

        setStatus({ type: 'success', message })
      } else {
        setStatus({ 
          type: 'error', 
          message: `❌ Erro ao tocar ${soundName}: ${result.error || 'Erro desconhecido'}` 
        })
      }
    } catch (error) {
      setStatus({ type: 'error', message: `❌ Erro ao tocar ${soundName}. Verifique se o bot está rodando.` })
    } finally {
      setIsLoading(false)
    }
  }

  // Tocar link rápido
  const playQuickLink = async () => {
    if (!quickLink.trim()) {
      setStatus({ type: 'error', message: 'Cole um link no campo &quot;Link Rápido&quot;' })
      return
    }

    if (!guildId || !voiceChannelId) {
      setStatus({ type: 'error', message: 'Configure Guild ID e Voice Channel ID primeiro' })
      return
    }

    setIsLoading(true)
    setStatus({ type: 'info', message: '🎵 Processando link...' })

    try {
      const response = await fetch('/api/play', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          soundUrl: quickLink.trim(),
          guildId,
          voiceChannelId,
          volume
        })
      })

      const result: PlayResponse = await response.json()

      if (response.ok && result.ok) {
        let message = '✅ Link processado com sucesso!'
        
        if (result.source === 'SPOTIFY_FALLBACK_YT') {
          message += ' (Sem preview no Spotify — reproduzindo equivalente do YouTube)'
        } else if (result.source === 'YT') {
          message += ' (YouTube)'
        } else if (result.source === 'SPOTIFY_PREVIEW') {
          message += ' (Spotify Preview)'
        } else if (result.source === 'DIRECT') {
          message += ' (Áudio direto)'
        }

        setStatus({ type: 'success', message })
        saveToLocalStorage('quickLink', quickLink.trim())
      } else {
        setStatus({ 
          type: 'error', 
          message: `❌ Erro ao processar link: ${result.error || 'Erro desconhecido'}` 
        })
      }
    } catch (error) {
      setStatus({ type: 'error', message: '❌ Erro ao processar link. Verifique se o bot está rodando.' })
    } finally {
      setIsLoading(false)
    }
  }

  // Filtrar sons baseado na busca
  const filteredSounds = sounds.filter(sound =>
    sound.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Limpar status após 5 segundos
  useEffect(() => {
    if (status) {
      const timer = setTimeout(() => setStatus(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [status])

  return (
    <div className="min-h-screen bg-discord-darker text-white">
      {/* Header */}
      <header className="bg-discord-dark border-b border-gray-700">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-center text-discord-blurple">
            🎵 Soundboard Discord
          </h1>
          <p className="text-center text-gray-300 mt-2">
            Interface web para tocar sons no Discord com suporte a YouTube e Spotify
          </p>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Configuração do Discord */}
        <div className="card mb-8">
          <h2 className="text-xl font-semibold mb-4 text-discord-blurple">
            ⚙️ Configuração do Discord
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2">Guild ID (Servidor)</label>
              <input
                type="text"
                value={guildId}
                onChange={(e) => {
                  setGuildId(e.target.value)
                  saveToLocalStorage('guildId', e.target.value)
                }}
                placeholder="123456789012345678"
                className="input-field w-full"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Voice Channel ID</label>
              <input
                type="text"
                value={voiceChannelId}
                onChange={(e) => {
                  setVoiceChannelId(e.target.value)
                  saveToLocalStorage('voiceChannelId', e.target.value)
                }}
                placeholder="123456789012345678"
                className="input-field w-full"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Volume (0-1)</label>
              <input
                type="number"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={(e) => {
                  const vol = parseFloat(e.target.value)
                  setVolume(vol)
                  saveToLocalStorage('volume', vol)
                }}
                className="input-field w-full"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={testConnection}
              disabled={!guildId || !voiceChannelId || connectionStatus === 'testing'}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {connectionStatus === 'testing' ? '🔄 Testando...' : '🔗 Test Connection'}
            </button>
            
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${
                connectionStatus === 'connected' ? 'bg-discord-green' :
                connectionStatus === 'error' ? 'bg-discord-red' :
                connectionStatus === 'testing' ? 'bg-discord-yellow animate-pulse-slow' :
                'bg-gray-500'
              }`} />
              <span className="text-sm text-gray-300">
                {connectionStatus === 'connected' ? 'Conectado' :
                 connectionStatus === 'error' ? 'Erro' :
                 connectionStatus === 'testing' ? 'Testando...' :
                 'Desconectado'}
              </span>
            </div>
          </div>

          <div className="mt-4 p-3 bg-discord-darker rounded-lg border border-gray-600">
            <p className="text-sm text-gray-300">
              <strong>💡 Como obter IDs:</strong> Ative &quot;Developer Mode&quot; no Discord (Configurações → Avançado), 
              clique com botão direito no servidor/canal → &quot;Copiar ID&quot;
            </p>
          </div>
        </div>

        {/* Link Rápido */}
        <div className="card mb-8">
          <h2 className="text-xl font-semibold mb-4 text-discord-green">
            🚀 Link Rápido
          </h2>
          
          <div className="flex gap-4">
            <input
              type="url"
              value={quickLink}
              onChange={(e) => setQuickLink(e.target.value)}
              placeholder="Cole aqui links de mp3, YouTube ou Spotify..."
              className="input-field flex-1"
            />
            <button
              onClick={playQuickLink}
              disabled={!quickLink.trim() || isLoading || !guildId || !voiceChannelId}
              className="btn-success disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '🔄 Processando...' : '▶️ Tocar Link'}
            </button>
          </div>
          
          <div className="mt-3 p-3 bg-discord-darker rounded-lg border border-gray-600">
            <p className="text-sm text-gray-300">
              <strong>📋 Suportado:</strong> Links diretos (mp3/ogg/wav), YouTube (youtube.com/youtu.be), 
              Spotify tracks (open.spotify.com/track). Para Spotify sem preview, o sistema busca automaticamente no YouTube.
            </p>
          </div>
        </div>

        {/* Busca */}
        <div className="mb-6">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="🔍 Buscar sons..."
            className="input-field w-full max-w-md"
          />
        </div>

        {/* Biblioteca de Sons */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4 text-discord-fuchsia">
            📚 Biblioteca de Sons ({filteredSounds.length})
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredSounds.map((sound, index) => (
              <button
                key={index}
                onClick={() => playSound(sound.url, sound.name)}
                disabled={isLoading || !guildId || !voiceChannelId}
                className="btn-secondary text-left h-24 flex flex-col justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-transform"
              >
                <div className="font-medium truncate">{sound.name}</div>
                <div className="text-xs text-gray-400 truncate mt-1">
                  {sound.url.includes('youtube.com') || sound.url.includes('youtu.be') ? '🎥 YouTube' :
                   sound.url.includes('open.spotify.com') ? '🎵 Spotify' : '🔊 Áudio Direto'}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Status/Toast */}
        {status && (
          <div className={`fixed bottom-4 right-4 p-4 rounded-lg shadow-lg max-w-md z-50 ${
            status.type === 'success' ? 'bg-discord-green text-black' :
            status.type === 'error' ? 'bg-discord-red text-white' :
            'bg-discord-yellow text-black'
          }`}>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                {status.type === 'success' ? '✅' : status.type === 'error' ? '❌' : 'ℹ️'}
              </div>
              <div className="text-sm">
                <p className="font-medium">{status.message}</p>
              </div>
              <button
                onClick={() => setStatus(null)}
                className="flex-shrink-0 ml-2 text-gray-600 hover:text-gray-800"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
