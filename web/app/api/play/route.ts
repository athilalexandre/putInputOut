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

    try {
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
        }),
        // Adicionar timeout para evitar que a Vercel mate a função antes da hora
        signal: AbortSignal.timeout(8000)
      })

      const responseText = await botResponse.text()
      console.log(`📥 Resposta bruta do bot (Status ${botResponse.status}):`, responseText)

      let result
      try {
        result = JSON.parse(responseText)
      } catch (e) {
        console.error('❌ Falha ao parsear JSON do bot:', responseText)
        return NextResponse.json(
          { error: `Resposta inválida do bot: ${responseText.substring(0, 100)}` },
          { status: 502 }
        )
      }

      if (!botResponse.ok) {
        console.error('❌ Bot retornou erro:', result)
        return NextResponse.json(
          { error: result.error || 'O bot não conseguiu processar o áudio' },
          { status: botResponse.status }
        )
      }

      console.log('✅ Resposta do bot processada:', result)

      return NextResponse.json({
        ok: true,
        source: result.source,
        message: result.message || 'Som enviado com sucesso'
      })
    } catch (fetchError: any) {
      console.error('❌ Erro de rede ao chamar o bot:', fetchError)
      return NextResponse.json(
        { error: `Falha na conexão com o bot: ${fetchError.message}` },
        { status: 504 }
      )
    }

  } catch (error: any) {
    console.error('Erro crítico na API /play:', error)
    return NextResponse.json(
      { error: `Erro crítico: ${error.message}` },
      { status: 500 }
    )
  }
}
