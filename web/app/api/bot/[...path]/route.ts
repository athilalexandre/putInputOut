import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type RouteContext = {
  params: Promise<{
    path: string[]
  }>
}

function getBotEndpoints(): string[] {
  const raw = process.env.BOT_ENDPOINT || process.env.NEXT_PUBLIC_BOT_ENDPOINT || 'http://localhost:3001'
  return raw.split(',').map(u => u.trim().replace(/\/$/, ''))
}

async function proxyToBot(request: NextRequest, context: RouteContext) {
  const { path } = await context.params
  const endpoints = getBotEndpoints()

  const headers = new Headers()
  const contentType = request.headers.get('content-type')
  if (contentType) headers.set('content-type', contentType)
  headers.set('ngrok-skip-browser-warning', 'true')

  const method = request.method
  const body = method === 'GET' || method === 'HEAD' ? undefined : await request.arrayBuffer()

  let lastError: any = null

  for (const endpoint of endpoints) {
    const targetUrl = new URL(`${endpoint}/${path.join('/')}`)
    targetUrl.search = request.nextUrl.search

    console.log(`🔗 [Proxy] Tentando bot em: ${targetUrl.toString()}`)

    try {
      const botResponse = await fetch(targetUrl, {
        method,
        headers,
        body: body ? body.slice(0) : undefined,
        cache: 'no-store',
        signal: AbortSignal.timeout(6000) // 6 segundos de timeout por tentativa
      })

      const responseHeaders = new Headers()
      const responseContentType = botResponse.headers.get('content-type')
      if (responseContentType) responseHeaders.set('content-type', responseContentType)

      return new NextResponse(await botResponse.arrayBuffer(), {
        status: botResponse.status,
        headers: responseHeaders
      })
    } catch (error: any) {
      console.warn(`⚠️ [Proxy] Falha no endpoint ${endpoint}:`, error.message)
      lastError = error
    }
  }

  console.error('❌ [Proxy] Falha em todos os endpoints de bot:', lastError)
  return NextResponse.json(
    { error: `Falha na conexao com o bot: ${lastError?.message || 'Sem conexão com nenhum endpoint'}` },
    { status: 504 }
  )
}

export async function GET(request: NextRequest, context: RouteContext) {
  return proxyToBot(request, context)
}

export async function POST(request: NextRequest, context: RouteContext) {
  return proxyToBot(request, context)
}
