'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import sounds from '../sounds.json'
import PermissionChecker from '../components/PermissionChecker'
import AudioVisualizer from '../components/AudioVisualizer'

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
  const avatarUrl = session?.user?.discordId && session?.user?.avatar
    ? `https://cdn.discordapp.com/avatars/${session.user.discordId}/${session.user.avatar}.png`
    : 'https://cdn.discordapp.com/embed/avatars/0.png'

  // Estados para configuração do Discord
  const [guildId, setGuildId] = useState('')
  const [voiceChannelId, setVoiceChannelId] = useState('')

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
  const [isHelpOpen, setIsHelpOpen] = useState(false)
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadName, setUploadName] = useState('')

  // Estados para delete
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [deleteUrl, setDeleteUrl] = useState('')
  const [deletePassword, setDeletePassword] = useState('')

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
        setSoundList(sounds)
      }
    } catch (err) {
      console.error('Erro ao buscar sons do bot:', err)
      setSoundList(sounds)
    }
  }

  // Verificar autenticação
  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [authStatus, router])

  // Salvar configurações no localStorage quando mudarem
  useEffect(() => {
    if (guildId) localStorage.setItem('guildId', guildId)
    if (voiceChannelId) localStorage.setItem('voiceChannelId', voiceChannelId)
    if (quickLink) localStorage.setItem('quickLink', quickLink)
  }, [guildId, voiceChannelId, quickLink])

  // Carregar configurações do localStorage (apenas no mount)
  useEffect(() => {
    const savedGuildId = localStorage.getItem('guildId')
    const savedVoiceChannelId = localStorage.getItem('voiceChannelId')
    const savedQuickLink = localStorage.getItem('quickLink')

    if (savedGuildId) setGuildId(savedGuildId)
    if (savedVoiceChannelId) setVoiceChannelId(savedVoiceChannelId)
    if (savedQuickLink) setQuickLink(savedQuickLink)

    fetchSounds()
  }, [])

  const renameSound = async (url: string, newName: string) => {
    try {
      const botEndpoint = process.env.NEXT_PUBLIC_BOT_ENDPOINT || 'http://localhost:3001'
      const response = await fetch(`${botEndpoint}/api/sounds/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({ url, newName })
      })

      if (response.ok) {
        setEditingIndex(null)
        setStatus({ type: 'success', message: '✅ Nome atualizado com sucesso!' })
        fetchSounds()
      } else {
        const errorData = await response.json()
        setStatus({ type: 'error', message: `❌ Erro ao atualizar nome: ${errorData.error || 'Erro desconhecido'}` })
      }
    } catch (err) {
      setStatus({ type: 'error', message: '❌ Erro de conexão com o bot.' })
    }
  }

  // Testar conexão
  const testConnection = async () => {
    if (!guildId || !voiceChannelId) {
      setStatus({ type: 'error', message: 'Configure Guild ID e Voice Channel ID primeiro' })
      return
    }

    setConnectionStatus('testing')
    setStatus({ type: 'info', message: '🔄 Testando conexão com o bot...' })

    try {
      const botEndpoint = process.env.NEXT_PUBLIC_BOT_ENDPOINT || 'http://localhost:3001'
      const response = await fetch(`${botEndpoint}/health`, {
        headers: { 'ngrok-skip-browser-warning': 'true' }
      })

      const result = await response.json()

      if (response.ok && result.status === 'ok') {
        setConnectionStatus('connected')
        setStatus({ type: 'success', message: '✅ Bot online e pronto! Agora você pode tocar sons.' })
      } else {
        setConnectionStatus('error')
        setStatus({ type: 'error', message: `❌ Erro na conexão: ${result.error || 'O bot não respondeu corretamente'}` })
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
          voiceChannelId
        })
      })

      const result: PlayResponse = await response.json()

      if (response.ok && result.ok) {
        setStatus({ type: 'success', message: '✅ Link iniciado com sucesso!' })
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
          voiceChannelId
        })
      })

      const result: PlayResponse = await response.json()

      if (response.ok && result.ok) {
        setStatus({ type: 'success', message: '✅ Link iniciado com sucesso!' })
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

  // Funções de controle de reprodução
  const pauseAudio = async () => {
    const botEndpoint = process.env.NEXT_PUBLIC_BOT_ENDPOINT || 'http://localhost:3001'
    try {
      const response = await fetch(`${botEndpoint}/pause`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
        body: JSON.stringify({ guildId })
      })
      if (response.ok) {
        setStatus({ type: 'info', message: '⏸️ Áudio pausado' })
      }
    } catch (error) {
      setStatus({ type: 'error', message: '❌ Erro ao pausar' })
    }
  }

  const resumeAudio = async () => {
    const botEndpoint = process.env.NEXT_PUBLIC_BOT_ENDPOINT || 'http://localhost:3001'
    try {
      const response = await fetch(`${botEndpoint}/resume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
        body: JSON.stringify({ guildId })
      })
      if (response.ok) {
        setStatus({ type: 'success', message: '▶️ Reprodução retomada' })
      }
    } catch (error) {
      setStatus({ type: 'error', message: '❌ Erro ao retomar' })
    }
  }

  const stopAudio = async () => {
    const botEndpoint = process.env.NEXT_PUBLIC_BOT_ENDPOINT || 'http://localhost:3001'
    try {
      const response = await fetch(`${botEndpoint}/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
        body: JSON.stringify({ guildId })
      })
      if (response.ok) {
        setStatus({ type: 'info', message: '⏹️ Reprodução parada' })
      }
    } catch (error) {
      setStatus({ type: 'error', message: '❌ Erro ao parar' })
    }
  }

  const handleUpload = async () => {
    if (!uploadFile) {
      setStatus({ type: 'error', message: 'Selecione um arquivo primeiro' })
      return
    }

    setIsLoading(true)
    setStatus({ type: 'info', message: '📤 Fazendo upload do som...' })

    const formData = new FormData()
    formData.append('audio', uploadFile)
    formData.append('name', uploadName)

    try {
      const botEndpoint = process.env.NEXT_PUBLIC_BOT_ENDPOINT || 'http://localhost:3001'
      const response = await fetch(`${botEndpoint}/api/sounds/upload`, {
        method: 'POST',
        headers: {
          'ngrok-skip-browser-warning': 'true'
        },
        body: formData
      })

      if (response.ok) {
        setStatus({ type: 'success', message: '✅ Upload concluído com sucesso!' })
        setIsUploadOpen(false)
        setUploadFile(null)
        setUploadName('')
        fetchSounds()
      } else {
        const errorData = await response.json()
        setStatus({ type: 'error', message: `❌ Erro no upload: ${errorData.error || 'Erro desconhecido'}` })
      }
    } catch (err) {
      console.error('Erro no upload:', err)
      setStatus({ type: 'error', message: '❌ Erro de conexão com o bot durante o upload.' })
    } finally {
      setIsLoading(false)
    }
  }

  // Função para confirmar delete
  const confirmDelete = async () => {
    if (!deletePassword) return;

    try {
      const botEndpoint = process.env.NEXT_PUBLIC_BOT_ENDPOINT || 'http://localhost:3001'
      const response = await fetch(`${botEndpoint}/api/sounds/delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({ url: deleteUrl, password: deletePassword })
      })

      const data = await response.json();

      if (response.ok) {
        setStatus({ type: 'success', message: '✅ Som deletado com sucesso!' })
        setIsDeleteOpen(false)
        setDeletePassword('')
        fetchSounds()
      } else {
        setStatus({ type: 'error', message: `❌ Erro ao deletar: ${data.error}` })
      }
    } catch (err) {
      setStatus({ type: 'error', message: '❌ Erro de conexão com o bot.' })
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

            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsHelpOpen(true)}
                className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-discord-grayLighter hover:text-white transition-all text-xs font-bold uppercase tracking-wider border border-white/5"
              >
                ❓ Ajuda
              </button>

              <div className="text-right hidden sm:block">
                <p className="text-[10px] text-discord-grayLighter uppercase font-bold">Logado como</p>
                <p className="text-sm font-semibold text-white">{session?.user?.username}</p>
              </div>
              <Image
                src={avatarUrl}
                alt=""
                width={32}
                height={32}
                unoptimized
                className="w-8 h-8 rounded-full border border-white/10"
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
              <div className="lg:col-span-4 space-y-4">

                {/* 🎵 PLAYER VISUAL - DESTAQUE PRINCIPAL */}
                <AudioVisualizer
                  guildId={guildId}
                  botEndpoint={process.env.NEXT_PUBLIC_BOT_ENDPOINT || 'http://localhost:3001'}
                />

                {/* 🎮 CONTROLES DO PLAYER */}
                <div className="card !bg-gradient-to-br from-[#1a1a2e] via-discord-dark to-[#16213e] !border-purple-500/20">
                  {/* Input de Link */}
                  <div className="relative mb-4">
                    <input
                      type="url"
                      value={quickLink}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuickLink(e.target.value)}
                      placeholder="Cole um link do YouTube ou MyInstants..."
                      className="input-field w-full text-sm !bg-black/30 !border-purple-500/20 focus:!border-purple-500 pr-12"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-400 text-lg">🔗</span>
                  </div>

                  {/* Botão Principal de Play */}
                  <button
                    onClick={playQuickLink}
                    disabled={!quickLink || isLoading}
                    className="w-full py-4 rounded-2xl font-bold text-white text-lg transition-all duration-300 bg-gradient-to-r from-purple-600 via-fuchsia-500 to-pink-500 hover:from-purple-500 hover:via-fuchsia-400 hover:to-pink-400 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Carregando...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <span className="text-2xl">▶</span>
                        Tocar Agora
                      </span>
                    )}
                  </button>

                  {/* Controles de Reprodução */}
                  <div className="grid grid-cols-3 gap-2 mt-4">
                    <button
                      onClick={pauseAudio}
                      disabled={!guildId}
                      className="flex flex-col items-center gap-1 py-3 rounded-xl bg-white/5 hover:bg-yellow-500/20 border border-white/5 hover:border-yellow-500/30 transition-all group disabled:opacity-30"
                    >
                      <span className="text-2xl group-hover:scale-110 transition-transform">⏸</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 group-hover:text-yellow-400">Pausar</span>
                    </button>
                    <button
                      onClick={resumeAudio}
                      disabled={!guildId}
                      className="flex flex-col items-center gap-1 py-3 rounded-xl bg-white/5 hover:bg-green-500/20 border border-white/5 hover:border-green-500/30 transition-all group disabled:opacity-30"
                    >
                      <span className="text-2xl group-hover:scale-110 transition-transform">▶</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 group-hover:text-green-400">Retomar</span>
                    </button>
                    <button
                      onClick={stopAudio}
                      disabled={!guildId}
                      className="flex flex-col items-center gap-1 py-3 rounded-xl bg-white/5 hover:bg-red-500/20 border border-white/5 hover:border-red-500/30 transition-all group disabled:opacity-30"
                    >
                      <span className="text-2xl group-hover:scale-110 transition-transform">⏹</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 group-hover:text-red-400">Parar</span>
                    </button>
                  </div>

                  <p className="text-[10px] text-center text-gray-500 mt-3 font-medium">
                    Suporta links do YouTube, MyInstants e arquivos MP3/WAV diretos.
                  </p>
                </div>

                {/* ⚙️ CONFIGURAÇÕES - Colapsável */}
                <details className="group">
                  <summary className="flex items-center justify-between p-4 rounded-2xl bg-discord-dark border border-white/5 cursor-pointer hover:bg-discord-grayDark transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">⚙️</span>
                      <span className="font-bold text-sm text-gray-400">Configurações do Servidor</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-gray-600'}`} />
                      <span className="text-xl text-gray-500 group-open:rotate-180 transition-transform">▼</span>
                    </div>
                  </summary>

                  <div className="mt-2 p-4 rounded-2xl bg-discord-darker border border-white/5 space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5">Server ID</label>
                      <input
                        type="text"
                        value={guildId}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGuildId(e.target.value)}
                        className="input-field w-full text-sm !py-2"
                        placeholder="ID do servidor Discord"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5">Channel ID</label>
                      <input
                        type="text"
                        value={voiceChannelId}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setVoiceChannelId(e.target.value)}
                        className="input-field w-full text-sm !py-2"
                        placeholder="ID do canal de voz"
                      />
                    </div>
                    <button
                      onClick={testConnection}
                      disabled={!guildId || !voiceChannelId || connectionStatus === 'testing'}
                      className="w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      {connectionStatus === 'testing' ? '🔄 Testando...' : '🔗 Testar Conexão'}
                    </button>
                    <div className="text-center text-[10px] text-gray-500">
                      {connectionStatus === 'connected' ? '✅ Conectado' : connectionStatus === 'error' ? '❌ Erro' : '⏳ Não testado'}
                    </div>
                  </div>
                </details>
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
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setIsUploadOpen(true)}
                        className="btn-primary !py-1.5 !px-3 !text-[11px] !bg-discord-fuchsia/10 !text-discord-fuchsia !border-discord-fuchsia/20 hover:!bg-discord-fuchsia hover:!text-white"
                      >
                        + Upload Sound
                      </button>
                      <span className="px-3 py-1 bg-white/5 rounded-full text-[10px] font-bold text-gray-400 uppercase tracking-widest border border-white/5">
                        {filteredSounds.length} Sons Disponíveis
                      </span>
                    </div>
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
                                  {sound.url.includes('youtube') ? '📺' : '🔊'}
                                </div>
                                <div className="flex-1 overflow-hidden">
                                  <div className="font-bold text-sm truncate opacity-90 group-hover:opacity-100">{sound.name}</div>
                                  <div className="text-[10px] font-bold text-discord-grayLighter uppercase tracking-wider mt-0.5">
                                    {sound.url.includes('youtube') ? 'YouTube' :
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
                              className="absolute top-3 right-12 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-white hover:bg-white/10 rounded-lg"
                              title="Renomear"
                            >
                              ✏️
                            </button>

                            <button
                              onClick={(e: React.MouseEvent) => {
                                e.stopPropagation()
                                setDeleteUrl(sound.url)
                                setIsDeleteOpen(true)
                              }}
                              className="absolute top-3 right-3 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-red-500 hover:bg-white/10 rounded-lg"
                              title="Deletar"
                            >
                              🗑️
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
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGuildId(e.target.value)}
                    placeholder="Cole o ID do servidor aqui..."
                    className="input-field w-full"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-discord-grayLighter uppercase mb-2 ml-1">Channel ID</label>
                  <input
                    type="text"
                    value={voiceChannelId}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setVoiceChannelId(e.target.value)}
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

        {/* Modais (devem estar aqui dentro) */}
        {isHelpOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-discord-dark w-full max-w-2xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-discord-blurple/10 to-transparent">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <span className="text-discord-blurple">❓</span> Central de Ajuda
                </h3>
                <button onClick={() => setIsHelpOpen(false)} className="text-gray-400 hover:text-white text-2xl">×</button>
              </div>

              <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <section>
                  <h4 className="text-discord-blurple font-bold uppercase text-xs tracking-widest mb-3">1. Como entrar no site e conectar?</h4>
                  <div className="bg-white/5 p-4 rounded-2xl space-y-3 text-sm text-discord-grayLighter">
                    <p>• Obtenha o seu <strong>Server ID</strong> clicando com o botão direito no ícone do servidor no Discord.</p>
                    <p>• Obtenha o <strong>Channel ID</strong> clicando com o botão direito no canal de voz.</p>
                    <p>• <em>Nota: Você precisa do &quot;Modo Desenvolvedor&quot; ativo nas Configurações &gt; Avançado do seu Discord.</em></p>
                    <p>• Clique em <strong>Testar Conexão</strong>. Se o dot ficar <span className="text-discord-green">Verde</span>, você está pronto!</p>
                  </div>
                </section>

                <section>
                  <h4 className="text-discord-green font-bold uppercase text-xs tracking-widest mb-3">2. Como tocar os áudios?</h4>
                  <div className="bg-white/5 p-4 rounded-2xl space-y-3 text-sm text-discord-grayLighter">
                    <p>• <strong>Biblioteca:</strong> Basta clicar no card de qualquer som na lista.</p>
                    <p>• <strong>Link Rápido:</strong> Cole uma URL do YouTube, MyInstants ou link direto (MP3/WAV) e clique em <strong>Tocar Agora</strong>.</p>
                  </div>
                </section>

                <section>
                  <h4 className="text-discord-fuchsia font-bold uppercase text-xs tracking-widest mb-3">3. Como gerenciar seus sons?</h4>
                  <div className="bg-white/5 p-4 rounded-2xl space-y-3 text-sm text-discord-grayLighter">
                    <p>• <strong>Renomear:</strong> Passe o mouse sobre um som na biblioteca e clique no ícone de lápis ✏️.</p>
                    <p>• <strong>Upload:</strong> Clique no botão <strong>+ Upload Sound</strong> na biblioteca para enviar um arquivo MP3 do seu PC.</p>
                  </div>
                </section>
              </div>

              <div className="p-6 bg-discord-darker border-t border-white/5 flex justify-end">
                <button onClick={() => setIsHelpOpen(false)} className="btn-primary">Entendi, valeu! 🚀</button>
              </div>
            </div>
          </div>
        )}

        {isUploadOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-discord-dark w-full max-w-md rounded-3xl border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-xl font-bold">📤 Upload de Áudio</h3>
                <button onClick={() => setIsUploadOpen(false)} className="text-gray-400 hover:text-white text-2xl">×</button>
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-[11px] font-bold text-discord-grayLighter uppercase mb-2 ml-1">Nome do Som</label>
                  <input
                    type="text"
                    value={uploadName}
                    onChange={(e) => setUploadName(e.target.value)}
                    placeholder="Ex: Ratinhooo"
                    className="input-field w-full"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-discord-grayLighter uppercase mb-2 ml-1">Arquivo (MP3, WAV, OGG)</label>
                  <div className="relative group">
                    <input
                      type="file"
                      id="audio-upload"
                      accept=".mp3,.wav,.ogg,.m4a"
                      onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                    <label
                      htmlFor="audio-upload"
                      className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-white/10 rounded-2xl hover:border-discord-blurple/50 hover:bg-white/5 cursor-pointer transition-all"
                    >
                      <span className="text-3xl mb-2">📁</span>
                      <span className="text-sm font-medium text-gray-400">
                        {uploadFile ? uploadFile.name : 'Clique para selecionar arquivo'}
                      </span>
                    </label>
                  </div>
                </div>

                <button
                  onClick={handleUpload}
                  disabled={isLoading || !uploadFile}
                  className="btn-primary w-full py-4"
                >
                  {isLoading ? '📤 Enviando...' : 'Confirmar Upload 🚀'}
                </button>
              </div>
            </div>
          </div>
        )}

        {isDeleteOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-discord-dark w-full max-w-sm rounded-3xl border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-xl font-bold text-red-500">🗑️ Deletar Som?</h3>
                <button onClick={() => setIsDeleteOpen(false)} className="text-gray-400 hover:text-white text-2xl">×</button>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-gray-300 text-sm">
                  Tem certeza que deseja remover este som da biblioteca? Essa ação não pode ser desfeita.
                </p>

                <div>
                  <label className="block text-[11px] font-bold text-discord-grayLighter uppercase mb-2 ml-1">Senha de Administrador</label>
                  <input
                    type="password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    placeholder="Digite a senha..."
                    className="input-field w-full !border-red-500/30 focus:!border-red-500"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setIsDeleteOpen(false)}
                    className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 font-bold transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={confirmDelete}
                    disabled={!deletePassword}
                    className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Deletar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

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
    </div >
  )
}
