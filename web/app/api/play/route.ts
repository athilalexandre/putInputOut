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

    const rawEndpoints = process.env.BOT_ENDPOINT || 'http://localhost:3001'
    const endpoints = rawEndpoints.split(',').map(u => u.trim().replace(/\/$/, ''))
    const secret = process.env.SHARED_SECRET || 'chave_secreta_123'

    let lastError: any = null

    for (const botEndpoint of endpoints) {
      console.log(`🔗 [Play] Tentando bot em: ${botEndpoint}/play`)

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
          // Timeout menor por tentativa para permitir fallback rápido dentro dos limites da Vercel
          signal: AbortSignal.timeout(6000)
        })

        const responseText = await botResponse.text()
        console.log(`📥 Resposta bruta do bot (${botEndpoint} Status ${botResponse.status}):`, responseText)

        let result
        try {
          result = JSON.parse(responseText)
        } catch (e) {
          console.error(`❌ Falha ao parsear JSON do bot em ${botEndpoint}:`, responseText)
          // Se a resposta for lixo, talvez o endpoint esteja quebrado, vamos tentar o próximo
          continue
        }

        if (!botResponse.ok) {
          console.error(`❌ Bot em ${botEndpoint} retornou erro:`, result)
          return NextResponse.json(
            { error: result.error || 'O bot não conseguiu processar o áudio' },
            { status: botResponse.status }
          )
        }

        console.log(`✅ Resposta do bot em ${botEndpoint} processada:`, result)

        return NextResponse.json({
          ok: true,
          source: result.source,
          message: result.message || 'Som enviado com sucesso'
        })
      } catch (fetchError: any) {
        console.error(`❌ Erro de rede ao chamar o bot em ${botEndpoint}:`, fetchError.message)
        lastError = fetchError
      }
    }

    // Se falhou em todos os endpoints
    return NextResponse.json(
      { error: `Falha na conexão com o bot: ${lastError?.message || 'Nenhum endpoint de bot respondeu'}` },
      { status: 504 }
    )

  } catch (error: any) {
    console.error('Erro crítico na API /play:', error)
    return NextResponse.json(
      { error: `Erro crítico: ${error.message}` },
      { status: 500 }
    )
  }
}
