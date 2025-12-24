'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'

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
      <div className="bg-discord-darker border border-discord-red rounded-lg p-6 text-center">
        <div className="text-4xl mb-4">🚫</div>
        <h3 className="text-xl font-semibold text-discord-red mb-2">
          Acesso Negado
        </h3>
        <p className="text-gray-300 mb-4">
          {error || 'Você não tem permissão para usar este canal de voz'}
        </p>

        <div className="bg-discord-dark p-4 rounded-lg border border-gray-600 text-left">
          <h4 className="font-medium text-discord-yellow mb-2">
            🔑 Permissões Necessárias:
          </h4>
          <ul className="text-sm text-gray-300 space-y-1">
            <li>• Ser membro do servidor</li>
            <li>• Ter permissão para ver o canal de voz</li>
            <li>• Ter permissão para conectar ao canal (se não for admin)</li>
          </ul>
        </div>

        <button
          onClick={checkPermissions}
          className="mt-4 bg-discord-blurple hover:bg-discord-blurple-dark text-white font-semibold py-2 px-4 rounded-lg transition-colors"
        >
          🔄 Verificar Novamente
        </button>
      </div>
    )
  }

  return <>{children}</>
}
