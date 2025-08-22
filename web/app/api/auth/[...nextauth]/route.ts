import NextAuth from 'next-auth'
import DiscordProvider from 'next-auth/providers/discord'

const handler = NextAuth({
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'identify guilds guilds.join'
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account) {
        token.accessToken = account.access_token || ''
        token.refreshToken = account.refresh_token || ''
      }
      if (profile) {
        token.discordId = profile.id || ''
        token.username = profile.username || ''
        token.avatar = profile.avatar || ''
      }
      return token
    },
    async session({ session, token }) {
      session.user.discordId = token.discordId
      session.user.username = token.username
      session.user.avatar = token.avatar
      session.accessToken = token.accessToken
      return session
    }
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error'
  }
})

export { handler as GET, handler as POST }
