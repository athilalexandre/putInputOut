import { NextRequest, NextResponse } from 'next/server'

const DISCORD_API = 'https://discord.com/api/v10'

const ADMINISTRATOR = 1n << 3n
const VIEW_CHANNEL = 1n << 10n
const CONNECT = 1n << 20n

interface DiscordUser {
  id: string
  username: string
  avatar: string | null
}

interface DiscordGuild {
  id: string
  owner_id: string
}

interface DiscordMember {
  roles: string[]
}

interface DiscordRole {
  id: string
  permissions: string
}

interface DiscordChannel {
  id: string
  guild_id?: string
  type: number
  permission_overwrites?: PermissionOverwrite[]
}

interface PermissionOverwrite {
  id: string
  type: 0 | 1
  allow: string
  deny: string
}

class DiscordApiError extends Error {
  constructor(
    public status: number,
    public path: string,
    details: string
  ) {
    super(`Discord API ${status} em ${path}: ${details}`)
  }
}

function jsonResponse(hasPermission: boolean, message: string, user?: DiscordUser & { isAdmin: boolean }) {
  return NextResponse.json(
    {
      hasPermission,
      message,
      ...(user ? { user } : {})
    },
    { status: 200 }
  )
}

function parsePermissions(value?: string) {
  try {
    return BigInt(value || '0')
  } catch {
    return 0n
  }
}

async function discordFetch<T>(path: string, token: string, tokenType: 'Bearer' | 'Bot') {
  const response = await fetch(`${DISCORD_API}${path}`, {
    headers: {
      Authorization: `${tokenType} ${token}`
    },
    cache: 'no-store'
  })

  if (!response.ok) {
    const details = await response.text().catch(() => '')
    throw new DiscordApiError(response.status, path, details)
  }

  return response.json() as Promise<T>
}

function applyOverwrite(base: bigint, overwrite?: PermissionOverwrite) {
  if (!overwrite) return base
  const denied = parsePermissions(overwrite.deny)
  const allowed = parsePermissions(overwrite.allow)
  return (base & ~denied) | allowed
}

function calculateChannelPermissions(
  guildId: string,
  userId: string,
  memberRoles: string[],
  roles: DiscordRole[],
  overwrites: PermissionOverwrite[] = []
) {
  const rolesById = new Map(roles.map((role) => [role.id, role]))
  let permissions = parsePermissions(rolesById.get(guildId)?.permissions)

  for (const roleId of memberRoles) {
    permissions |= parsePermissions(rolesById.get(roleId)?.permissions)
  }

  if ((permissions & ADMINISTRATOR) === ADMINISTRATOR) {
    return permissions
  }

  permissions = applyOverwrite(
    permissions,
    overwrites.find((overwrite) => overwrite.id === guildId)
  )

  let roleAllow = 0n
  let roleDeny = 0n
  for (const overwrite of overwrites) {
    if (overwrite.type === 0 && memberRoles.includes(overwrite.id)) {
      roleAllow |= parsePermissions(overwrite.allow)
      roleDeny |= parsePermissions(overwrite.deny)
    }
  }
  permissions = (permissions & ~roleDeny) | roleAllow

  permissions = applyOverwrite(
    permissions,
    overwrites.find((overwrite) => overwrite.type === 1 && overwrite.id === userId)
  )

  return permissions
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const guildId = String(body.guildId || '').trim()
    const voiceChannelId = String(body.voiceChannelId || '').trim()
    const accessToken = String(body.accessToken || '').trim()
    const botToken = process.env.DISCORD_BOT_TOKEN || process.env.DISCORD_TOKEN

    if (!guildId || !voiceChannelId || !accessToken) {
      return NextResponse.json(
        { error: 'Parametros invalidos', hasPermission: false },
        { status: 400 }
      )
    }

    if (!botToken) {
      return jsonResponse(false, 'Token do bot nao configurado no servidor web')
    }

    const user = await discordFetch<DiscordUser>('/users/@me', accessToken, 'Bearer')

    let guild: DiscordGuild
    try {
      guild = await discordFetch<DiscordGuild>(`/guilds/${guildId}`, botToken, 'Bot')
    } catch (error) {
      console.error('Erro ao buscar servidor:', error)
      if (error instanceof DiscordApiError && error.status === 401) {
        return jsonResponse(false, 'Token do bot invalido na Vercel. Atualize DISCORD_BOT_TOKEN com o token correto do bot.')
      }
      return jsonResponse(false, 'Bot nao encontrado neste servidor. Convide o bot para o servidor e confira se o Server ID esta correto.')
    }

    let channel: DiscordChannel
    try {
      channel = await discordFetch<DiscordChannel>(`/channels/${voiceChannelId}`, botToken, 'Bot')
    } catch (error) {
      console.error('Erro ao buscar canal:', error)
      return jsonResponse(false, 'Canal nao encontrado ou inacessivel para o bot. Confira o Channel ID e as permissoes do bot.')
    }

    if (channel.guild_id && channel.guild_id !== guildId) {
      return jsonResponse(false, 'Este canal nao pertence ao servidor informado')
    }

    if (![2, 13].includes(channel.type)) {
      return jsonResponse(false, 'Este nao e um canal de voz valido')
    }

    if (guild.owner_id === user.id) {
      return jsonResponse(true, 'Acesso permitido (dono do servidor)', {
        id: user.id,
        username: user.username,
        avatar: user.avatar,
        isAdmin: true
      })
    }

    let member: DiscordMember
    try {
      member = await discordFetch<DiscordMember>(`/guilds/${guildId}/members/${user.id}`, botToken, 'Bot')
    } catch (error) {
      console.error('Erro ao buscar membro:', error)
      return jsonResponse(false, 'Voce nao e membro deste servidor ou o bot nao consegue ver membros')
    }

    const roles = await discordFetch<DiscordRole[]>(`/guilds/${guildId}/roles`, botToken, 'Bot')
    const permissions = calculateChannelPermissions(
      guildId,
      user.id,
      member.roles,
      roles,
      channel.permission_overwrites
    )

    const isAdmin = (permissions & ADMINISTRATOR) === ADMINISTRATOR
    const canViewChannel = (permissions & VIEW_CHANNEL) === VIEW_CHANNEL
    const canConnect = (permissions & CONNECT) === CONNECT

    if (isAdmin || (canViewChannel && canConnect)) {
      return jsonResponse(true, isAdmin ? 'Acesso permitido (admin)' : 'Acesso permitido', {
        id: user.id,
        username: user.username,
        avatar: user.avatar,
        isAdmin
      })
    }

    return jsonResponse(false, 'Voce nao tem permissao para ver e conectar a este canal de voz')
  } catch (error) {
    console.error('Erro ao verificar permissoes:', error)
    return NextResponse.json(
      {
        error: 'Erro interno do servidor',
        hasPermission: false
      },
      { status: 500 }
    )
  }
}
