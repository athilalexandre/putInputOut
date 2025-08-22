import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { guildId, voiceChannelId, accessToken } = await request.json()

    if (!guildId || !voiceChannelId || !accessToken) {
      return NextResponse.json(
        { error: 'Parâmetros inválidos' },
        { status: 400 }
      )
    }

    // Primeiro, obter informações do usuário através do token OAuth
    const userResponse = await fetch(
      `https://discord.com/api/v10/users/@me`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    if (!userResponse.ok) {
      return NextResponse.json(
        { 
          hasPermission: false, 
          message: 'Token de acesso inválido' 
        },
        { status: 200 }
      )
    }

    const user = await userResponse.json()

    // Verificar se o usuário é membro do servidor (usando bot token)
    const memberResponse = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}/members/${user.id}`,
      {
        headers: {
          Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
        },
      }
    )

    if (!memberResponse.ok) {
      return NextResponse.json(
        { 
          hasPermission: false, 
          message: 'Você não é membro deste servidor' 
        },
        { status: 200 }
      )
    }

    const member = await memberResponse.json()

    // Verificar permissões do canal
    const channelResponse = await fetch(
      `https://discord.com/api/v10/channels/${voiceChannelId}`,
      {
        headers: {
          Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
        },
      }
    )

    if (!channelResponse.ok) {
      return NextResponse.json(
        { 
          hasPermission: false, 
          message: 'Canal não encontrado' 
        },
        { status: 200 }
      )
    }

    const channel = await channelResponse.json()

    // Verificar se é um canal de voz
    if (channel.type !== 2) { // 2 = canal de voz
      return NextResponse.json(
        { 
          hasPermission: false, 
          message: 'Este não é um canal de voz válido' 
        },
        { status: 200 }
      )
    }

    // Verificar se é dono do servidor ou admin
    const guildResponse = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}`,
      {
        headers: {
          Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
        },
      }
    )

    let isOwner = false
    if (guildResponse.ok) {
      const guild = await guildResponse.json()
      isOwner = guild.owner_id === user.id
    }

    // Verificar se tem permissão de administrador
    const userPermissions = parseInt(member.permissions || '0')
    const isAdmin = (userPermissions & 0x00000008) !== 0 // ADMINISTRATOR permission

    // Se for owner ou admin, permitir acesso
    if (isOwner || isAdmin) {
      return NextResponse.json(
        { 
          hasPermission: true,
          message: 'Acesso permitido (Admin)',
          user: {
            id: user.id,
            username: user.username,
            avatar: user.avatar,
            isAdmin: true
          }
        },
        { status: 200 }
      )
    }

    // Verificar permissões específicas do canal
    const canConnect = (userPermissions & 0x00100000) !== 0 // CONNECT permission
    const canViewChannel = (userPermissions & 0x00000400) !== 0 // VIEW_CHANNEL permission

    if (canConnect && canViewChannel) {
      return NextResponse.json(
        { 
          hasPermission: true,
          message: 'Acesso permitido',
          user: {
            id: user.id,
            username: user.username,
            avatar: user.avatar,
            isAdmin: false
          }
        },
        { status: 200 }
      )
    } else {
      return NextResponse.json(
        { 
          hasPermission: false, 
          message: 'Você não tem permissão para conectar a este canal de voz' 
        },
        { status: 200 }
      )
    }

  } catch (error) {
    console.error('Erro ao verificar permissões:', error)
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        hasPermission: false 
      },
      { status: 500 }
    )
  }
}
