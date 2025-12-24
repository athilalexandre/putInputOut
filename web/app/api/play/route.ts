import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 API /play chamada')

    const body = await request.json()
    console.log('📦 Dados recebidos:', {
      soundUrl: body.soundUrl,
      guildId: body.guildId,
      voiceChannelId: body.voiceChannelId,
      volume: body.volume
    })

    const { soundUrl, guildId, voiceChannelId, volume } = body

    // Validação dos parâmetros
    if (!soundUrl || !guildId || !voiceChannelId) {
      console.log('❌ Parâmetros inválidos')
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

    const botEndpoint = process.env.BOT_ENDPOINT || 'http://localhost:3001'
    const secret = process.env.SHARED_SECRET || 'chave_secreta_123'

    console.log(`🔗 Chamando bot em: ${botEndpoint}/play`)

    const botResponse = await fetch(`${botEndpoint}/play`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify({
        soundUrl,
        guildId,
        voiceChannelId,
        volume: volume || 1,
        secret
      })
    })

    if (!botResponse.ok) {
      const errorData = await botResponse.json()
      console.error('❌ Erro na resposta do bot:', errorData)
      return NextResponse.json(
        { error: errorData.error || 'O bot não conseguiu processar o áudio' },
        { status: botResponse.status }
      )
    }

    const result = await botResponse.json()
    console.log('✅ Resposta do bot:', result)

    return NextResponse.json({
      ok: true,
      source: result.source,
      message: result.message || 'Som enviado com sucesso'
    })

  } catch (error) {
    console.error('Erro na API /play:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
