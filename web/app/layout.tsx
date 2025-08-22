import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_APP_NAME || 'PutIn PutOut',
  description: 'Interface web para soundboard Discord com suporte a YouTube e Spotify',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <div className="min-h-screen bg-discord-darker">
          {children}
        </div>
      </body>
    </html>
  )
}
