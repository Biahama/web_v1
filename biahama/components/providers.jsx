'use client'

import { AuthProvider } from '@/components/providers/AuthProvider'
import { CartProvider } from '@/lib/cart'

export default function Providers({ children }) {
  return (
    <AuthProvider>
      <CartProvider>
        {children}
      </CartProvider>
    </AuthProvider>
  )
}
