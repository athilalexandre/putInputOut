import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { soundUrl, guildId, voiceChannelId, volume } = await request.json()

    // Validação dos parâmetros
    if (!soundUrl || !guildId || !voiceChannelId) {
      return NextResponse.json(
        { error: 'Parâmetros obrigatórios: soundUrl, guildId, voiceChannelId' },
        { status: 400 }
      )
    }

    // Validar volume (0-1)
    if (volume !== undefined && (volume < 0 || volume > 1)) {
      return NextResponse.json(
        { error: 'Volume deve estar entre 0 e 1' },
        { status: 400 }
      )
    }

    // Chamar o bot
    const botEndpoint = process.env.BOT_ENDPOINT
    if (!botEndpoint) {
      return NextResponse.json(
        { error: 'BOT_ENDPOINT não configurado' },
        { status: 500 }
      )
    }

    const sharedSecret = process.env.SHARED_SECRET
    if (!sharedSecret) {
      return NextResponse.json(
        { error: 'SHARED_SECRET não configurado' },
        { status: 500 }
      )
    }

    const response = await fetch(`${botEndpoint}/play`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        secret: sharedSecret,
        guildId,
        voiceChannelId,
        soundUrl,
        volume: volume ?? 1,
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        { 
          error: result.error || 'Erro ao comunicar com o bot',
          details: result.details 
        },
        { status: response.status }
      )
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('Erro na API /play:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
