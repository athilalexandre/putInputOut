import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type RouteContext = {
  params: Promise<{
    path: string[]
  }>
}

function getBotEndpoint() {
  return (process.env.BOT_ENDPOINT || process.env.NEXT_PUBLIC_BOT_ENDPOINT || 'http://localhost:3001').replace(/\/$/, '')
}

async function proxyToBot(request: NextRequest, context: RouteContext) {
  const { path } = await context.params
  const targetUrl = new URL(`${getBotEndpoint()}/${path.join('/')}`)
  targetUrl.search = request.nextUrl.search

  const headers = new Headers()
  const contentType = request.headers.get('content-type')
  if (contentType) headers.set('content-type', contentType)
  headers.set('ngrok-skip-browser-warning', 'true')

  const method = request.method
  const body = method === 'GET' || method === 'HEAD' ? undefined : await request.arrayBuffer()

  try {
    const botResponse = await fetch(targetUrl, {
      method,
      headers,
      body,
      cache: 'no-store',
      signal: AbortSignal.timeout(15000)
    })

    const responseHeaders = new Headers()
    const responseContentType = botResponse.headers.get('content-type')
    if (responseContentType) responseHeaders.set('content-type', responseContentType)

    return new NextResponse(await botResponse.arrayBuffer(), {
      status: botResponse.status,
      headers: responseHeaders
    })
  } catch (error: any) {
    console.error('Erro ao encaminhar requisicao para o bot:', error)
    return NextResponse.json(
      { error: `Falha na conexao com o bot: ${error.message}` },
      { status: 504 }
    )
  }
}

export async function GET(request: NextRequest, context: RouteContext) {
  return proxyToBot(request, context)
}

export async function POST(request: NextRequest, context: RouteContext) {
  return proxyToBot(request, context)
}
