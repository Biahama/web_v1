'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { useAuth } from '@/components/providers/AuthProvider'
import { trackEvent } from '@/lib/analytics-client'

const CartContext = createContext({ items: [], count: 0, add: () => {}, remove: () => {}, updateQty: () => {}, clear: () => {} })

const LS_KEY = 'biahama_cart'

function readLocalCart() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]') } catch { return [] }
}

function writeLocalCart(items) {
  localStorage.setItem(LS_KEY, JSON.stringify(items))
}

// Send a cart change to the server. If it fails, say so clearly in
// the browser console instead of silently ignoring it — otherwise the
// cart on screen and the cart in the database quietly drift apart.
async function syncToServer(action, doFetch) {
  try {
    const res = await doFetch()
    if (!res.ok) {
      console.error(`[cart] Could not ${action}: server responded with status ${res.status}`)
    }
  } catch (err) {
    console.error(`[cart] Could not ${action}: ${err.message}`)
  }
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
              syncToServer('merge guest cart item', () =>
                fetch('/api/cart', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ variantId: g.variantId, quantity: g.quantity }),
                })
              )
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
    // Compute the new quantity INSIDE the state updater, where "prev"
    // is always the latest cart. The old code read the outer "items"
    // variable, which on rapid clicks could be a stale snapshot and
    // sent the wrong quantity to the server.
    let newQty = quantity
    setItems(prev => {
      const existing = prev.find(i => i.variantId === variant.id)
      newQty = (existing?.quantity || 0) + quantity
      const next = existing
        ? prev.map(i => i.variantId === variant.id ? { ...i, quantity: newQty } : i)
        : [...prev, { variantId: variant.id, variant, quantity }]

      if (!session) writeLocalCart(next)
      return next
    })

    // Count this for the admin Analytics page (variant id is fine for counting).
    trackEvent('add_to_cart', { productId: variant.id })

    if (session) {
      await syncToServer('add item to cart', () =>
        fetch('/api/cart', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ variantId: variant.id, quantity: newQty }),
        })
      )
    }
  }

  async function remove(variantId) {
    setItems(prev => {
      const next = prev.filter(i => i.variantId !== variantId)
      if (!session) writeLocalCart(next)
      return next
    })
    if (session) {
      await syncToServer('remove item from cart', () =>
        fetch(`/api/cart?variantId=${variantId}`, { method: 'DELETE' })
      )
    }
  }

  async function updateQty(variantId, quantity) {
    if (quantity < 1) return remove(variantId)

    setItems(prev => {
      const next = prev.map(i => i.variantId === variantId ? { ...i, quantity } : i)
      if (!session) writeLocalCart(next)
      return next
    })

    if (session) {
      await syncToServer('update item quantity', () =>
        fetch('/api/cart', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ variantId, quantity }),
        })
      )
    }
  }

  async function clear() {
    setItems([])
    if (!session) {
      localStorage.removeItem(LS_KEY)
    } else {
      await syncToServer('clear cart', () => fetch('/api/cart', { method: 'DELETE' }))
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
