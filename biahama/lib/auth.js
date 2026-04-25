import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

/** @type {import('next-auth').AuthOptions} */
export const authOptions = {
  session: { strategy: /** @type {const} */ ('jwt') },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email:    { label: 'Email',    type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })

        if (!user || !user.passwordHash) return null

        const valid = await bcrypt.compare(credentials.password, user.passwordHash)
        if (!valid) return null

        return { id: user.id, name: user.name, email: user.email }
      },
    }),
    GoogleProvider({
      clientId:     process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google') {
        const existing = await prisma.user.findUnique({ where: { email: user.email } })
        if (!existing) {
          await prisma.user.create({
            data: { email: user.email, name: user.name, provider: 'google' },
          })
        }
      }
      return true
    },
    async jwt({ token, user }) {
      if (user) token.id = user.id
      if (!token.id) {
        const dbUser = await prisma.user.findUnique({ where: { email: token.email } })
        if (dbUser) token.id = dbUser.id
      }
      return token
    },
    async session({ session, token }) {
      if (token?.id) session.user.id = token.id
      return session
    },
  },
  pages: {
    signIn: '/login',
    error:  '/login',
  },
}
