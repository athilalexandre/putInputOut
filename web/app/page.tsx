'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import sounds from '../sounds.json'
import PermissionChecker from '../components/PermissionChecker'

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
  const { data: session, status: authStatus } = useSession()
  const router = useRouter()

  // Estados para configuração do Discord
  const [guildId, setGuildId] = useState('')
  const [voiceChannelId, setVoiceChannelId] = useState('')
  const [volume, setVolume] = useState(1)

  // Estados para link rápido
  const [quickLink, setQuickLink] = useState('')

  // Estados para busca e sons
  const [searchTerm, setSearchTerm] = useState('')
  const [soundList, setSoundList] = useState<Sound[]>([])
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editingName, setEditingName] = useState('')

  // Estados de UI
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'connected' | 'error'>('idle')

  // Verificar autenticação
  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [authStatus, router])

  // Carregar configurações do localStorage
  useEffect(() => {
    const savedGuildId = localStorage.getItem('guildId')
    const savedVoiceChannelId = localStorage.getItem('voiceChannelId')
    const savedVolume = localStorage.getItem('volume')
    const savedQuickLink = localStorage.getItem('quickLink')

    if (savedGuildId) setGuildId(savedGuildId)
    if (savedVoiceChannelId) setVoiceChannelId(savedVoiceChannelId)
    if (savedVolume) setVolume(parseFloat(savedVolume))
    if (savedQuickLink) setQuickLink(savedQuickLink)
    // Carregar sons inicialmente
    fetchSounds()
  }, [])

  const fetchSounds = async () => {
    try {
      const botEndpoint = process.env.NEXT_PUBLIC_BOT_ENDPOINT || 'http://localhost:3001'
      const response = await fetch(`${botEndpoint}/api/sounds`, {
        headers: {
          'ngrok-skip-browser-warning': 'true'
        }
      })
      if (response.ok) {
        const data = await response.json()
        setSoundList(data)
      } else {
        // Fallback para o arquivo local se o bot não estiver online
        setSoundList(sounds)
      }
    } catch (err) {
      console.error('Erro ao buscar sons do bot:', err)
      setSoundList(sounds)
    }
  }

  const renameSound = async (url: string, newName: string) => {
    try {
      const botEndpoint = process.env.NEXT_PUBLIC_BOT_ENDPOINT || 'http://localhost:3001'
      const response = await fetch(`${botEndpoint}/api/sounds/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({
          url,
          newName
        })
      })

      if (response.ok) {
        setEditingIndex(null)
        setStatus({ type: 'success', message: '✅ Nome atualizado com sucesso!' })
        fetchSounds() // Recarregar lista
      } else {
        const errorData = await response.json()
        setStatus({ type: 'error', message: `❌ Erro ao atualizar nome: ${errorData.error || 'Erro desconhecido'}` })
      }
    } catch (err) {
      setStatus({ type: 'error', message: '❌ Erro de conexão com o bot.' })
    }
  }

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
    setStatus({ type: 'info', message: '🎵 Testando conexão e tocando música de boas-vindas...' })

    try {
      const response = await fetch('/api/play', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          soundUrl: 'https://www.youtube.com/watch?v=QUlMp1X1Gtk',
          guildId,
          voiceChannelId,
          volume: 0.5
        })
      })

      if (response.ok) {
        setConnectionStatus('connected')
        setStatus({ type: 'success', message: '✅ Conexão testada com sucesso! 🎵 Tocando música de boas-vindas PutIn PutOut!' })
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
        let message = '✅ Link iniciado com sucesso!'

        if (result.source === 'SPOTIFY_PREVIEW') {
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
  const filteredSounds = soundList.filter((sound: Sound) =>
    sound.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Limpar status após 5 segundos
  useEffect(() => {
    if (status) {
      const timer = setTimeout(() => setStatus(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [status])

  // Loading state
  if (authStatus === 'loading') {
    return (
      <div className="min-h-screen bg-discord-darker flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-discord-blurple"></div>
      </div>
    )
  }

  // Não autenticado
  if (authStatus === 'unauthenticated') {
    return null
  }

  return (
    <div className="min-h-screen bg-discord-darker text-white font-['Outfit']">
      {/* Header */}
      <header className="bg-discord-dark border-b border-white/5 sticky top-0 z-40 backdrop-blur-md bg-opacity-80">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-discord-blurple p-2 rounded-xl shadow-lg shadow-indigo-500/20">
                <span className="text-2xl">🎵</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                  PutIn PutOut
                </h1>
                <p className="text-[11px] text-discord-grayLighter uppercase tracking-widest font-semibold">
                  Premium Soundboard
                </p>
              </div>
            </div>

            {/* User Info */}
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-[10px] text-discord-grayLighter uppercase font-bold">Logado como</p>
                <p className="text-sm font-semibold text-white">{session?.user?.username}</p>
              </div>
              <img
                src={`https://cdn.discordapp.com/avatars/${session?.user?.discordId}/${session?.user?.avatar}.png`}
                alt=""
                className="w-8 h-8 rounded-full border border-white/10"
                onError={(e) => (e.currentTarget.src = 'https://cdn.discordapp.com/embed/avatars/0.png')}
              />
              <button
                onClick={() => signOut({ callbackUrl: '/auth/signin' })}
                className="btn-secondary !py-1.5 !px-3 !text-xs !bg-discord-red/10 !text-discord-red !border-discord-red/20 hover:!bg-discord-red hover:!text-white"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {guildId && voiceChannelId ? (
          <PermissionChecker guildId={guildId} voiceChannelId={voiceChannelId}>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

              {/* Coluna Esquerda: Controles */}
              <div className="lg:col-span-4 space-y-6">
                {/* Configuração do Discord */}
                <div className="card">
                  <h2 className="text-lg font-bold mb-5 flex items-center gap-2 text-discord-blurple">
                    <span className="opacity-70">⚙️</span> Configurações
                  </h2>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-bold text-discord-grayLighter uppercase mb-1.5 ml-1">Server ID</label>
                      <input
                        type="text"
                        value={guildId}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          setGuildId(e.target.value)
                          saveToLocalStorage('guildId', e.target.value)
                        }}
                        className="input-field w-full text-sm font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-discord-grayLighter uppercase mb-1.5 ml-1">Channel ID</label>
                      <input
                        type="text"
                        value={voiceChannelId}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          setVoiceChannelId(e.target.value)
                          saveToLocalStorage('voiceChannelId', e.target.value)
                        }}
                        className="input-field w-full text-sm font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-discord-grayLighter uppercase mb-1.5 ml-1">Volume do Bot</label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={volume}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          const vol = parseFloat(e.target.value)
                          setVolume(vol)
                          saveToLocalStorage('volume', vol)
                        }}
                        className="w-full accent-discord-blurple bg-discord-darker cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-gray-400 mt-1 font-bold">
                        <span>MUDO</span>
                        <span>{Math.round(volume * 100)}%</span>
                      </div>
                    </div>

                    <button
                      onClick={testConnection}
                      disabled={!guildId || !voiceChannelId || connectionStatus === 'testing'}
                      className="btn-primary w-full mt-2"
                    >
                      {connectionStatus === 'testing' ? 'Testando...' : '🔗 Testar Conexão'}
                    </button>

                    <div className="flex items-center justify-center gap-2 py-1">
                      <div className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-discord-green shadow-[0_0_8px_#23A559]' :
                        connectionStatus === 'error' ? 'bg-discord-red shadow-[0_0_8px_#ED4245]' :
                          connectionStatus === 'testing' ? 'bg-discord-yellow animate-pulse' :
                            'bg-gray-600'
                        }`} />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                        {connectionStatus === 'connected' ? 'Servidor Pronto' :
                          connectionStatus === 'error' ? 'Erro de Conexão' :
                            connectionStatus === 'testing' ? 'Verificando...' :
                              'Status: Offline'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Link Rápido */}
                <div className="card !bg-gradient-to-br from-discord-dark to-[#232428]">
                  <h2 className="text-lg font-bold mb-5 flex items-center gap-2 text-discord-green">
                    <span className="opacity-70">🚀</span> Link Rápido
                  </h2>

                  <div className="space-y-4">
                    <input
                      type="url"
                      value={quickLink}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuickLink(e.target.value)}
                      placeholder="Spotify Track ou Link de Áudio (MP3/WAV)..."
                      className="input-field w-full text-sm"
                    />
                    <button
                      onClick={playQuickLink}
                      disabled={!quickLink.trim() || isLoading || !guildId || !voiceChannelId}
                      className="btn-success w-full"
                    >
                      {isLoading ? '🔄 Processando...' : '▶️ Tocar Agora'}
                    </button>
                    <p className="text-[10px] text-discord-grayLighter text-center italic">
                      Suporta links diretos e Spotify (apenas músicas com prévia)
                    </p>
                  </div>
                </div>
              </div>

              {/* Coluna Direita: Biblioteca */}
              <div className="lg:col-span-8 space-y-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="relative flex-1">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                      placeholder="Filtrar sons da biblioteca..."
                      className="input-field w-full pl-11 !rounded-2xl shadow-inner !bg-discord-darker/50"
                    />
                  </div>
                </div>

                <div className="card">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold flex items-center gap-2 text-discord-fuchsia">
                      <span className="opacity-70">📚</span> Biblioteca de Áudio
                    </h2>
                    <span className="px-3 py-1 bg-white/5 rounded-full text-[10px] font-bold text-gray-400 uppercase tracking-widest border border-white/5">
                      {filteredSounds.length} Sons Disponíveis
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 overflow-y-auto max-h-[700px] pr-2 custom-scrollbar">
                    {filteredSounds.map((sound: Sound, index: number) => (
                      <div key={index} className="relative">
                        {editingIndex === index ? (
                          <div className="bg-discord-darker p-3 rounded-2xl border border-discord-blurple shadow-xl animate-in fade-in slide-in-from-top-1">
                            <input
                              autoFocus
                              type="text"
                              value={editingName}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditingName(e.target.value)}
                              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                                if (e.key === 'Enter') renameSound(sound.url, editingName)
                                if (e.key === 'Escape') setEditingIndex(null)
                              }}
                              className="w-full bg-discord-grayDark border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none mb-3"
                            />
                            <div className="flex justify-end gap-3 font-bold text-[11px] uppercase tracking-wider">
                              <button onClick={() => setEditingIndex(null)} className="text-gray-400 hover:text-white transition-colors">Cancelar</button>
                              <button onClick={() => renameSound(sound.url, editingName)} className="text-discord-green hover:underline">Salvar Alterações</button>
                            </div>
                          </div>
                        ) : (
                          <div className="group relative">
                            <button
                              onClick={() => playSound(sound.url, sound.name)}
                              disabled={isLoading}
                              className="w-full bg-discord-darker hover:bg-discord-grayDark text-left p-4 rounded-2xl border border-white/5 transition-all duration-200 group-hover:border-discord-blurple/30 hover:shadow-xl hover:-translate-y-0.5"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-lg group-hover:bg-discord-blurple/20 group-hover:text-discord-blurple transition-colors">
                                  {sound.url.includes('spotify') ? '🎧' : '🔊'}
                                </div>
                                <div className="flex-1 overflow-hidden">
                                  <div className="font-bold text-sm truncate opacity-90 group-hover:opacity-100">{sound.name}</div>
                                  <div className="text-[10px] font-bold text-discord-grayLighter uppercase tracking-wider mt-0.5">
                                    {sound.url.includes('spotify') ? 'Spotify' :
                                      sound.url.includes('\\') || sound.url.includes('/') ? 'Arquivo Local' : 'Áudio Direto'}
                                  </div>
                                </div>
                              </div>
                            </button>

                            <button
                              onClick={(e: React.MouseEvent) => {
                                e.stopPropagation()
                                setEditingIndex(index)
                                setEditingName(sound.name)
                              }}
                              className="absolute top-3 right-3 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-white hover:bg-white/10 rounded-lg"
                              title="Renomear"
                            >
                              ✏️
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </PermissionChecker>
        ) : (
          <div className="text-center py-20 animate-in fade-in zoom-in duration-500">
            <div className="w-24 h-24 bg-discord-blurple/10 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-indigo-500/10">
              <span className="text-5xl">🎵</span>
            </div>
            <h2 className="text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-400">
              Bem-vindo ao PutIn PutOut
            </h2>
            <p className="text-discord-grayLighter mb-12 max-w-lg mx-auto text-lg">
              Sua central de áudio premium integrada ao Discord.
              Para começar, conecte o painel ao seu servidor.
            </p>

            <div className="card max-w-md mx-auto text-left">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <span className="text-discord-blurple">⚙️</span> Configuração Inicial
              </h3>

              <div className="space-y-5">
                <div>
                  <label className="block text-[11px] font-bold text-discord-grayLighter uppercase mb-2 ml-1">Server ID</label>
                  <input
                    type="text"
                    value={guildId}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      setGuildId(e.target.value)
                      saveToLocalStorage('guildId', e.target.value)
                    }}
                    placeholder="Cole o ID do servidor aqui..."
                    className="input-field w-full"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-discord-grayLighter uppercase mb-2 ml-1">Channel ID</label>
                  <input
                    type="text"
                    value={voiceChannelId}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      setVoiceChannelId(e.target.value)
                      saveToLocalStorage('voiceChannelId', e.target.value)
                    }}
                    placeholder="Cole o ID do canal de voz aqui..."
                    className="input-field w-full"
                  />
                </div>

                <div className="pt-2">
                  <div className="bg-discord-darker p-4 rounded-2xl border border-white/5">
                    <p className="text-xs text-discord-grayLighter leading-relaxed">
                      <strong className="text-white block mb-1">Dica:</strong>
                      Ative o Modo Desenvolvedor nas configurações do seu Discord para conseguir copiar os IDs com o botão direito.
                    </p>
                  </div>
                </div>

                {guildId && voiceChannelId && (
                  <button onClick={() => window.location.reload()} className="btn-primary w-full py-4 mt-2">
                    Finalizar Configuração 🚀
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Status/Toast Premium */}
        {status && (
          <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-right-10 duration-300">
            <div className={`p-1 rounded-2xl shadow-2xl backdrop-blur-xl border border-white/10 ${status.type === 'success' ? 'bg-discord-green/20' :
              status.type === 'error' ? 'bg-discord-red/20' :
                'bg-discord-yellow/20'
              }`}>
              <div className={`flex items-center gap-4 px-6 py-4 rounded-xl ${status.type === 'success' ? 'bg-[#23A559]/10 text-discord-green' :
                status.type === 'error' ? 'bg-[#ED4245]/10 text-discord-red' :
                  'bg-[#FEE75C]/10 text-discord-yellow'
                }`}>
                <div className="text-xl">
                  {status.type === 'success' ? '✔' : status.type === 'error' ? '✖' : 'ℹ'}
                </div>
                <div className="font-bold text-sm tracking-wide">
                  {status.message}
                </div>
                <button
                  onClick={() => setStatus(null)}
                  className="ml-4 opacity-50 hover:opacity-100 transition-opacity"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
