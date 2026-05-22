'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession, signOut } from 'next-auth/react'

interface PermissionCheckerProps {
  guildId: string
  voiceChannelId: string
  children: React.ReactNode
}

interface DiscordMember {
  user: {
    id: string
    username: string
    avatar: string
  }
  roles: string[]
  permissions: string
}

interface DiscordChannel {
  id: string
  name: string
  permissions: string
}

export default function PermissionChecker({ guildId, voiceChannelId, children }: PermissionCheckerProps) {
  const { data: session } = useSession()
  const [hasPermission, setHasPermission] = useState(false)
  const [isChecking, setIsChecking] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const checkPermissions = useCallback(async () => {
    try {
      setIsChecking(true)
      setError(null)

      // Verificar se o usuário é membro do servidor
      const memberResponse = await fetch(`/api/discord/check-permissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          guildId,
          voiceChannelId,
          accessToken: session?.accessToken
        })
      })

      if (!memberResponse.ok) {
        throw new Error('Erro ao verificar permissões')
      }

      const result = await memberResponse.json()

      if (result.hasPermission) {
        setHasPermission(true)
      } else {
        setError(result.message || 'Você não tem permissão para usar este canal')
        setHasPermission(false)
      }
    } catch (err) {
      setError('Erro ao verificar permissões. Tente novamente.')
      setHasPermission(false)
    } finally {
      setIsChecking(false)
    }
  }, [guildId, voiceChannelId, session?.accessToken])

  useEffect(() => {
    if (!session?.accessToken || !guildId || !voiceChannelId) {
      setHasPermission(false)
      setIsChecking(false)
      return
    }

    checkPermissions()
  }, [session?.accessToken, guildId, voiceChannelId, checkPermissions])

  if (isChecking && !hasPermission) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-discord-blurple"></div>
        <span className="ml-3 text-gray-300">Verificando permissões...</span>
      </div>
    )
  }

  if (!hasPermission) {
    return (
      <div className="max-w-2xl mx-auto my-12 animate-in fade-in zoom-in-95 duration-500">
        <div className="bg-gradient-to-br from-[#1d1e2e] via-discord-dark to-[#161726] border border-discord-red/30 rounded-3xl p-8 text-center shadow-2xl shadow-red-500/5 backdrop-blur-md relative overflow-hidden">
          {/* Soft background glows */}
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-discord-red/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-discord-blurple/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-discord-red/10 text-discord-red border border-discord-red/20 mb-6 shadow-lg shadow-red-500/10">
            <span className="text-3xl">🚫</span>
          </div>

          <h3 className="text-2xl font-bold text-discord-red mb-3">
            Acesso Negado
          </h3>
          
          <p className="text-discord-grayLighter mb-6 text-sm max-w-md mx-auto leading-relaxed">
            {error || 'Não foi possível se comunicar com o bot neste servidor ou canal. Por favor, verifique as permissões listadas abaixo.'}
          </p>

          <div className="bg-black/30 p-6 rounded-2xl border border-white/5 text-left mb-8 max-w-lg mx-auto">
            <h4 className="font-bold text-discord-yellow text-xs uppercase tracking-wider mb-3 flex items-center gap-2">
              <span>🔑</span> Permissões Necessárias:
            </h4>
            <ul className="text-sm text-discord-grayLighter space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-discord-red font-bold">✔</span>
                <span>O bot precisa estar convidado para este servidor (Server ID).</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-discord-red font-bold">✔</span>
                <span>Você precisa ser membro ativo desse mesmo servidor.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-discord-red font-bold">✔</span>
                <span>O bot e você devem ter permissão de visualização e conexão no canal de voz.</span>
              </li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <button
              onClick={checkPermissions}
              className="w-full sm:w-auto bg-discord-blurple hover:bg-discord-blurple-dark text-white font-bold py-3 px-6 rounded-xl transition-all duration-200 hover:-translate-y-0.5 active:scale-95 shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 text-sm"
            >
              🔄 Verificar Novamente
            </button>

            <button
              onClick={() => {
                localStorage.removeItem('guildId')
                localStorage.removeItem('voiceChannelId')
                window.location.reload()
              }}
              className="w-full sm:w-auto bg-white/5 hover:bg-white/10 text-discord-grayLighter hover:text-white font-bold py-3 px-6 rounded-xl border border-white/10 transition-all duration-200 hover:-translate-y-0.5 active:scale-95 flex items-center justify-center gap-2 text-sm"
            >
              ⚙️ Mudar de Servidor
            </button>

            <button
              onClick={() => {
                localStorage.clear()
                signOut({ callbackUrl: '/auth/signin' })
              }}
              className="w-full sm:w-auto bg-discord-red/10 hover:bg-discord-red text-discord-red hover:text-white font-bold py-3 px-6 rounded-xl border border-discord-red/20 transition-all duration-200 hover:-translate-y-0.5 active:scale-95 flex items-center justify-center gap-2 text-sm"
            >
              🗑️ Resetar Tudo
            </button>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
