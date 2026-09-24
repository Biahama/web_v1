'use client'

import { AuthProvider } from '@/components/providers/AuthProvider'
import { CartProvider } from '@/lib/cart'
import { WardrobeProvider } from '@/lib/wardrobe'

export default function Providers({ children }) {
  return (
    <AuthProvider>
      <CartProvider>
        <WardrobeProvider>
          {children}
        </WardrobeProvider>
      </CartProvider>
    </AuthProvider>
  )
}
