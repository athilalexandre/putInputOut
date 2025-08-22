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

    // Modo de desenvolvimento - simular resposta sem bot
    console.log('🔧 Modo de desenvolvimento - simulando resposta do bot')
    
    // Simular delay de processamento
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    return NextResponse.json({
      ok: true,
      source: 'DEV_MODE',
      message: 'Modo de desenvolvimento - áudio simulado com sucesso'
    })

  } catch (error) {
    console.error('Erro na API /play:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
