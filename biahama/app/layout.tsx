import type { Metadata } from 'next'
import { Cormorant_Garamond, Jost } from 'next/font/google'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Providers from '@/components/providers'
import './globals.css'

const cormorant = Cormorant_Garamond({
  variable: '--font-cormorant',
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  style: ['normal', 'italic'],
})

const jost = Jost({
  variable: '--font-jost',
  subsets: ['latin'],
  weight: ['300', '400', '500'],
})

export const metadata: Metadata = {
  title: 'Biahama — Luxury Linen',
  description: 'Luxury linen clothing crafted in India.',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)

  return (
    <html lang="en" className={`${cormorant.variable} ${jost.variable}`}>
      <body>
        <Providers session={session}>
          {children}
        </Providers>
      </body>
    </html>
  )
}
