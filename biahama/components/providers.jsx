'use client'

import { SessionProvider } from 'next-auth/react'
import { CartProvider } from '@/lib/cart'

export default function Providers({ children, session }) {
  return (
    <SessionProvider session={session}>
      <CartProvider>
        {children}
      </CartProvider>
    </SessionProvider>
  )
}
