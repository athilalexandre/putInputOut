'use client'

import { signIn, getSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SignIn() {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Verificar se já está logado
    getSession().then((session) => {
      if (session) {
        router.push('/')
      }
    })
  }, [router])

  const handleDiscordLogin = async () => {
    setIsLoading(true)
    try {
      await signIn('discord', { callbackUrl: '/' })
    } catch (error) {
      console.error('Erro no login:', error)
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-discord-darker flex items-center justify-center">
      <div className="bg-discord-dark p-8 rounded-lg shadow-xl border border-gray-700 max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-discord-blurple mb-2">
            🎵 PutIn PutOut
          </h1>
          <p className="text-gray-300">
            Faça login para acessar o soundboard
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={handleDiscordLogin}
            disabled={isLoading}
            className="w-full bg-discord-blurple hover:bg-discord-blurple-dark text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Conectando...
              </>
            ) : (
              <>
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
                Entrar com Discord
              </>
            )}
          </button>

          <div className="text-center">
            <p className="text-sm text-gray-400">
              Ao fazer login, você concorda com nossos termos de uso
            </p>
          </div>
        </div>

        <div className="mt-8 p-4 bg-discord-darker rounded-lg border border-gray-600">
          <h3 className="text-sm font-medium text-discord-green mb-2">
            🔒 Segurança
          </h3>
          <p className="text-xs text-gray-300">
            • Apenas verificamos suas permissões no Discord<br/>
            • Não temos acesso às suas mensagens privadas<br/>
            • Você pode revogar o acesso a qualquer momento
          </p>
        </div>
      </div>
    </div>
  )
}
