'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function AuthError() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  const getErrorMessage = (error: string | null) => {
    switch (error) {
      case 'Configuration':
        return 'Erro de configuração do servidor'
      case 'AccessDenied':
        return 'Acesso negado'
      case 'Verification':
        return 'Erro na verificação'
      default:
        return 'Erro desconhecido na autenticação'
    }
  }

  return (
    <div className="min-h-screen bg-discord-darker flex items-center justify-center">
      <div className="bg-discord-dark p-8 rounded-lg shadow-xl border border-gray-700 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-discord-red mb-2">
            Erro de Autenticação
          </h1>
          <p className="text-gray-300">
            {getErrorMessage(error)}
          </p>
        </div>

        <div className="space-y-4">
          <Link
            href="/auth/signin"
            className="w-full bg-discord-blurple hover:bg-discord-blurple-dark text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center transition-colors"
          >
            Tentar Novamente
          </Link>

          <Link
            href="/"
            className="w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center transition-colors"
          >
            Voltar ao Início
          </Link>
        </div>

        <div className="mt-8 p-4 bg-discord-darker rounded-lg border border-gray-600">
          <h3 className="text-sm font-medium text-discord-yellow mb-2">
            💡 Dicas
          </h3>
          <p className="text-xs text-gray-300">
            • Verifique se você tem uma conta Discord válida<br/>
            • Tente fazer logout e login novamente<br/>
            • Se o problema persistir, entre em contato com o suporte
          </p>
        </div>
      </div>
    </div>
  )
}
