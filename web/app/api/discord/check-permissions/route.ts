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

    // Verificar se o usuário é membro do servidor
    const memberResponse = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}/members/@me`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
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

    // Verificar permissões do usuário
    const permissionsResponse = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}/members/@me`,
      {
        headers: {
          Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
        },
      }
    )

    if (!permissionsResponse.ok) {
      return NextResponse.json(
        { 
          hasPermission: false, 
          message: 'Erro ao verificar permissões' 
        },
        { status: 200 }
      )
    }

    const userMember = await permissionsResponse.json()

    // Verificar se é admin ou tem permissões adequadas
    const hasAdminRole = userMember.roles.some((roleId: string) => {
      // Verificar se tem role de admin (você pode personalizar isso)
      return roleId === guildId // Owner role
    })

    // Verificar permissões específicas do canal
    const userPermissions = parseInt(userMember.permissions || '0')
    const canConnect = (userPermissions & 0x00000020) !== 0 // CONNECT permission
    const canViewChannel = (userPermissions & 0x00000400) !== 0 // VIEW_CHANNEL permission

    if (hasAdminRole || (canConnect && canViewChannel)) {
      return NextResponse.json(
        { 
          hasPermission: true,
          message: 'Acesso permitido',
          user: {
            id: userMember.user.id,
            username: userMember.user.username,
            avatar: userMember.user.avatar,
            isAdmin: hasAdminRole
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
