'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { useAuth } from '@/components/providers/AuthProvider'

const CartContext = createContext({ items: [], count: 0, add: () => {}, remove: () => {}, updateQty: () => {}, clear: () => {} })

const LS_KEY = 'biahama_cart'

function readLocalCart() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]') } catch { return [] }
}

function writeLocalCart(items) {
  localStorage.setItem(LS_KEY, JSON.stringify(items))
}

export function CartProvider({ children }) {
  const { session, loading } = useAuth()
  const status = loading ? 'loading' : session ? 'authenticated' : 'unauthenticated'
  const [items, setItems] = useState([])

  useEffect(() => {
    if (status === 'loading') return

    if (session) {
      // Fetch DB cart and merge any guest cart
      fetch('/api/cart')
        .then(r => r.json())
        .then(dbItems => {
          const dbCart = dbItems.map(i => ({
            variantId: i.variantId,
            quantity:  i.quantity,
            variant:   i.variant,
          }))

          const guestCart = readLocalCart()

          // Merge: for items in guest cart not in DB cart, add them
          const merged = [...dbCart]
          for (const g of guestCart) {
            if (!merged.find(i => i.variantId === g.variantId)) {
              merged.push(g)
              fetch('/api/cart', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ variantId: g.variantId, quantity: g.quantity }),
              })
            }
          }

          if (guestCart.length > 0) localStorage.removeItem(LS_KEY)
          setItems(merged)
        })
        .catch(() => setItems(readLocalCart()))
    } else {
      setItems(readLocalCart())
    }
  }, [session, status])

  async function add(variant, quantity = 1) {
    setItems(prev => {
      const existing = prev.find(i => i.variantId === variant.id)
      const next = existing
        ? prev.map(i => i.variantId === variant.id ? { ...i, quantity: i.quantity + quantity } : i)
        : [...prev, { variantId: variant.id, variant, quantity }]

      if (!session) writeLocalCart(next)
      return next
    })

    if (session) {
      const existing = items.find(i => i.variantId === variant.id)
      const newQty = (existing?.quantity || 0) + quantity
      await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variantId: variant.id, quantity: newQty }),
      })
    }
  }

  async function remove(variantId) {
    setItems(prev => {
      const next = prev.filter(i => i.variantId !== variantId)
      if (!session) writeLocalCart(next)
      return next
    })
    if (session) await fetch(`/api/cart?variantId=${variantId}`, { method: 'DELETE' })
  }

  async function updateQty(variantId, quantity) {
    if (quantity < 1) return remove(variantId)

    setItems(prev => {
      const next = prev.map(i => i.variantId === variantId ? { ...i, quantity } : i)
      if (!session) writeLocalCart(next)
      return next
    })

    if (session) {
      await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variantId, quantity }),
      })
    }
  }

  async function clear() {
    setItems([])
    if (!session) {
      localStorage.removeItem(LS_KEY)
    } else {
      await fetch('/api/cart', { method: 'DELETE' })
    }
  }

  const count = items.reduce((s, i) => s + i.quantity, 0)

  return (
    <CartContext.Provider value={{ items, count, add, remove, updateQty, clear }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  return useContext(CartContext)
}
