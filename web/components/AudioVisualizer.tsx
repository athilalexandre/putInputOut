'use client'

import { useState, useEffect, useRef } from 'react'

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
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const animationRef = useRef<number>(0)
    const timeRef = useRef(0)

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

    // Animação do Caleidoscópio
    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const isPlaying = status.status === 'playing'
        const isPaused = status.status === 'paused'

        const animate = () => {
            timeRef.current += isPlaying ? 0.02 : (isPaused ? 0.002 : 0.001)
            const t = timeRef.current

            const width = canvas.width
            const height = canvas.height
            const centerX = width / 2
            const centerY = height / 2

            // Limpar com fade
            ctx.fillStyle = isPlaying ? 'rgba(10, 5, 20, 0.1)' : 'rgba(10, 10, 15, 0.15)'
            ctx.fillRect(0, 0, width, height)

            if (!isPlaying && !isPaused) {
                // Estado idle - apenas um padrão sutil
                ctx.save()
                ctx.translate(centerX, centerY)

                for (let i = 0; i < 6; i++) {
                    ctx.rotate(Math.PI / 3)
                    ctx.beginPath()
                    ctx.moveTo(0, 0)
                    const dist = 50 + Math.sin(t * 0.5) * 20
                    ctx.lineTo(dist, dist * 0.5)
                    ctx.strokeStyle = `hsla(${260 + i * 10}, 50%, 30%, 0.3)`
                    ctx.lineWidth = 2
                    ctx.stroke()
                }
                ctx.restore()

                animationRef.current = requestAnimationFrame(animate)
                return
            }

            // Caleidoscópio ativo
            const segments = 8
            const angleStep = (Math.PI * 2) / segments

            ctx.save()
            ctx.translate(centerX, centerY)

            // Múltiplas camadas de formas
            for (let layer = 0; layer < 3; layer++) {
                const layerOffset = layer * 0.3

                for (let i = 0; i < segments; i++) {
                    ctx.save()
                    ctx.rotate(i * angleStep + t * (0.5 + layer * 0.2))

                    // Formas geométricas animadas
                    const numShapes = isPlaying ? 5 : 2
                    for (let j = 0; j < numShapes; j++) {
                        const distance = 30 + j * 25 + Math.sin(t * 2 + j + layerOffset) * 15
                        const size = 8 + Math.sin(t * 3 + j * 0.5) * 5
                        const hue = (t * 50 + i * 45 + j * 30 + layer * 60) % 360
                        const saturation = isPlaying ? 80 : 40
                        const lightness = isPlaying ? 60 : 30
                        const alpha = isPlaying ? 0.7 : 0.3

                        ctx.beginPath()

                        // Alternar entre diferentes formas
                        const shapeType = (i + j + layer) % 4

                        if (shapeType === 0) {
                            // Círculo
                            ctx.arc(distance, 0, size, 0, Math.PI * 2)
                        } else if (shapeType === 1) {
                            // Losango
                            ctx.moveTo(distance, -size)
                            ctx.lineTo(distance + size, 0)
                            ctx.lineTo(distance, size)
                            ctx.lineTo(distance - size, 0)
                            ctx.closePath()
                        } else if (shapeType === 2) {
                            // Triângulo
                            ctx.moveTo(distance, -size)
                            ctx.lineTo(distance + size, size)
                            ctx.lineTo(distance - size, size)
                            ctx.closePath()
                        } else {
                            // Estrela pequena
                            for (let k = 0; k < 5; k++) {
                                const angle = (k * Math.PI * 2) / 5 - Math.PI / 2
                                const r = k % 2 === 0 ? size : size * 0.5
                                const x = distance + Math.cos(angle) * r
                                const y = Math.sin(angle) * r
                                if (k === 0) ctx.moveTo(x, y)
                                else ctx.lineTo(x, y)
                            }
                            ctx.closePath()
                        }

                        ctx.fillStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`
                        ctx.fill()

                        // Brilho externo quando tocando
                        if (isPlaying && j === 0) {
                            ctx.shadowColor = `hsla(${hue}, 100%, 50%, 0.5)`
                            ctx.shadowBlur = 15
                        }
                    }

                    // Linhas conectoras
                    if (isPlaying) {
                        ctx.beginPath()
                        ctx.moveTo(20, 0)
                        const endDist = 80 + Math.sin(t * 2.5 + i) * 30
                        ctx.lineTo(endDist, Math.sin(t + i) * 20)
                        ctx.strokeStyle = `hsla(${(t * 30 + i * 45) % 360}, 70%, 50%, 0.4)`
                        ctx.lineWidth = 1.5
                        ctx.shadowBlur = 0
                        ctx.stroke()
                    }

                    ctx.restore()
                }
            }

            // Centro brilhante
            const pulseSize = isPlaying ? 15 + Math.sin(t * 4) * 8 : 10
            const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, pulseSize * 2)
            gradient.addColorStop(0, isPlaying ? 'rgba(255, 255, 255, 0.9)' : 'rgba(150, 100, 200, 0.5)')
            gradient.addColorStop(0.5, isPlaying ? `hsla(${t * 60 % 360}, 80%, 60%, 0.6)` : 'rgba(100, 50, 150, 0.3)')
            gradient.addColorStop(1, 'transparent')

            ctx.beginPath()
            ctx.arc(0, 0, pulseSize * 2, 0, Math.PI * 2)
            ctx.fillStyle = gradient
            ctx.fill()

            ctx.restore()

            // Anéis externos pulsantes quando tocando
            if (isPlaying) {
                for (let ring = 0; ring < 3; ring++) {
                    const ringRadius = 70 + ring * 20 + Math.sin(t * 2 + ring) * 10
                    const ringAlpha = 0.3 - ring * 0.08

                    ctx.beginPath()
                    ctx.arc(centerX, centerY, ringRadius, 0, Math.PI * 2)
                    ctx.strokeStyle = `hsla(${(t * 40 + ring * 40) % 360}, 70%, 50%, ${ringAlpha})`
                    ctx.lineWidth = 2
                    ctx.stroke()
                }
            }

            animationRef.current = requestAnimationFrame(animate)
        }

        // Configurar canvas
        const resize = () => {
            const rect = canvas.getBoundingClientRect()
            canvas.width = rect.width * window.devicePixelRatio
            canvas.height = rect.height * window.devicePixelRatio
            ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
        }

        resize()
        window.addEventListener('resize', resize)
        animate()

        return () => {
            window.removeEventListener('resize', resize)
            cancelAnimationFrame(animationRef.current)
        }
    }, [status.status])

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    const isPlaying = status.status === 'playing'
    const isPaused = status.status === 'paused'
    const isActive = isPlaying || isPaused

    return (
        <div className={`rounded-2xl overflow-hidden transition-all duration-500 ${isActive
                ? 'border border-purple-500/30 shadow-lg shadow-purple-500/20'
                : 'border border-white/5'
            }`}>
            {/* Canvas do Caleidoscópio */}
            <div className="relative h-44 bg-[#0a0510]">
                <canvas
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full"
                    style={{ imageRendering: 'auto' }}
                />

                {/* Overlay de gradiente */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none" />

                {/* Status overlay quando idle */}
                {!isActive && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                            <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">
                                Aguardando reprodução
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Track Info */}
            <div className="p-4 bg-gradient-to-r from-[#1a0a25] to-[#0a0515]">
                <div className="flex items-center gap-4">
                    {/* Album Art / Icon */}
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-all ${isPlaying
                            ? 'bg-gradient-to-br from-purple-500 to-fuchsia-500 shadow-lg shadow-purple-500/30 animate-pulse'
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
                                <span className="text-xs text-purple-400 font-mono">
                                    {formatTime(elapsed)}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Playing Animation */}
                    {isPlaying && (
                        <div className="flex items-center gap-1">
                            <div className="w-1 h-4 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                            <div className="w-1 h-6 bg-fuchsia-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                            <div className="w-1 h-3 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
