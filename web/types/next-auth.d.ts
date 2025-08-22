import NextAuth from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name: string
      email: string
      image: string
      discordId: string
      username: string
      avatar: string
    }
    accessToken: string
  }

  interface User {
    discordId: string
    username: string
    avatar: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    discordId: string
    username: string
    avatar: string
    accessToken: string
    refreshToken: string
  }
}
