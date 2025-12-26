'use client'

import { useState, useEffect } from 'react'

interface AudioVisualizerProps {
    guildId: string
    botEndpoint: string
}

interface PlayerStatus {
    status: 'idle' | 'playing' | 'paused' | 'buffering' | 'autopaused'
    trackName: string | null
    startedAt: number | null
    source: string
}

export default function AudioVisualizer({ guildId, botEndpoint }: AudioVisualizerProps) {
    const [status, setStatus] = useState<PlayerStatus>({
        status: 'idle',
        trackName: null,
        startedAt: null,
        source: 'unknown'
    })
    const [elapsed, setElapsed] = useState(0)

    // Polling para status do player
    useEffect(() => {
        if (!guildId) return

        const fetchStatus = async () => {
            try {
                const response = await fetch(`${botEndpoint}/status/${guildId}`, {
                    headers: { 'ngrok-skip-browser-warning': 'true' }
                })
                if (response.ok) {
                    const data = await response.json()
                    setStatus(data)
                }
            } catch (error) {
                console.error('Erro ao buscar status:', error)
            }
        }

        fetchStatus()
        const interval = setInterval(fetchStatus, 1000)
        return () => clearInterval(interval)
    }, [guildId, botEndpoint])

    // Atualizar tempo decorrido
    useEffect(() => {
        if (status.status === 'playing' && status.startedAt) {
            const timer = setInterval(() => {
                setElapsed(Math.floor((Date.now() - status.startedAt!) / 1000))
            }, 100)
            return () => clearInterval(timer)
        } else if (status.status === 'idle') {
            setElapsed(0)
        }
    }, [status.status, status.startedAt])

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    const isPlaying = status.status === 'playing'
    const isPaused = status.status === 'paused'
    const isActive = isPlaying || isPaused

    // Gerar barras do visualizador
    const bars = Array.from({ length: 32 }, (_, i) => i)

    return (
        <div className={`rounded-2xl overflow-hidden transition-all duration-500 ${isActive
                ? 'bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f0f23] border border-purple-500/30 shadow-lg shadow-purple-500/10'
                : 'bg-discord-darker border border-white/5'
            }`}>
            {/* Visualizer Container */}
            <div className="relative h-32 overflow-hidden">
                {/* Background Glow */}
                {isPlaying && (
                    <div className="absolute inset-0 bg-gradient-to-t from-purple-500/20 via-transparent to-transparent animate-pulse" />
                )}

                {/* Bars Visualizer - WMP Style */}
                <div className="absolute bottom-0 left-0 right-0 flex items-end justify-center gap-[2px] h-full px-4 pb-2">
                    {bars.map((i) => {
                        // Gerar altura aleatória animada quando tocando
                        const baseHeight = isPlaying ? 15 + Math.random() * 70 : (isPaused ? 20 : 5)
                        const delay = i * 0.02

                        return (
                            <div
                                key={i}
                                className={`w-[3px] rounded-t-sm transition-all ${isPlaying
                                        ? 'bg-gradient-to-t from-purple-500 via-fuchsia-400 to-cyan-400 animate-equalizer'
                                        : isPaused
                                            ? 'bg-gradient-to-t from-yellow-500/50 to-yellow-400/30'
                                            : 'bg-white/10'
                                    }`}
                                style={{
                                    height: `${baseHeight}%`,
                                    animationDelay: `${delay}s`,
                                    animationDuration: isPlaying ? `${0.3 + Math.random() * 0.3}s` : '0s'
                                }}
                            />
                        )
                    })}
                </div>

                {/* Reflection Effect */}
                {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-black/50 to-transparent" />
                )}

                {/* Status Overlay quando idle */}
                {!isActive && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                            <div className="text-4xl mb-2 opacity-30">🎵</div>
                            <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">
                                Aguardando reprodução
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Track Info */}
            <div className="p-4 bg-black/30">
                <div className="flex items-center gap-4">
                    {/* Album Art / Icon */}
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-all ${isPlaying
                            ? 'bg-gradient-to-br from-purple-500 to-fuchsia-500 shadow-lg shadow-purple-500/30 animate-spin-slow'
                            : isPaused
                                ? 'bg-yellow-500/20'
                                : 'bg-white/5'
                        }`}>
                        {status.source === 'youtube' ? '📺' :
                            status.source === 'spotify' ? '🎧' :
                                status.source === 'local' ? '💿' :
                                    status.source === 'myinstants' ? '🔊' : '🎵'}
                    </div>

                    {/* Track Details */}
                    <div className="flex-1 min-w-0">
                        <h3 className={`font-bold truncate transition-colors ${isActive ? 'text-white' : 'text-gray-500'
                            }`}>
                            {status.trackName || 'Nenhuma faixa'}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                            {/* Status Badge */}
                            <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${isPlaying
                                    ? 'bg-green-500/20 text-green-400'
                                    : isPaused
                                        ? 'bg-yellow-500/20 text-yellow-400'
                                        : 'bg-white/5 text-gray-500'
                                }`}>
                                {isPlaying ? '▶ Tocando' : isPaused ? '⏸ Pausado' : '⏹ Parado'}
                            </span>

                            {/* Elapsed Time */}
                            {isActive && (
                                <span className="text-xs text-gray-400 font-mono">
                                    {formatTime(elapsed)}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Playing Animation */}
                    {isPlaying && (
                        <div className="flex items-center gap-1">
                            <div className="w-1 h-4 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                            <div className="w-1 h-6 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                            <div className="w-1 h-3 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                        </div>
                    )}
                </div>

                {/* Progress Bar (visual only) */}
                {isActive && (
                    <div className="mt-3 h-1 bg-white/10 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all ${isPlaying
                                    ? 'bg-gradient-to-r from-purple-500 to-fuchsia-500'
                                    : 'bg-yellow-500/50'
                                }`}
                            style={{
                                width: isPlaying ? '100%' : '50%',
                                animation: isPlaying ? 'progress 30s linear infinite' : 'none'
                            }}
                        />
                    </div>
                )}
            </div>

            {/* CSS Animations */}
            <style jsx>{`
        @keyframes equalizer {
          0%, 100% { height: 15%; }
          50% { height: 85%; }
        }
        
        .animate-equalizer {
          animation: equalizer 0.4s ease-in-out infinite;
        }
        
        .animate-spin-slow {
          animation: spin 3s linear infinite;
        }
        
        @keyframes progress {
          0% { width: 0%; }
          100% { width: 100%; }
        }
      `}</style>
        </div>
    )
}
