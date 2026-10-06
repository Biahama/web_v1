'use client'
import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { useAuth } from '@/components/providers/AuthProvider'
import { trackEvent } from '@/lib/analytics-client'

const CartContext = createContext({ items: [], count: 0, loading: true, error: '', add: async () => false, remove: async () => false, updateQty: async () => false, refresh: async () => {}, clear: async () => false })
const LS_KEY = 'biahama_cart'
function readLocalCart() {
  try {
    const items = JSON.parse(localStorage.getItem(LS_KEY) || '[]')
    return Array.isArray(items) ? items.filter(i => typeof i.variantId === 'string' && i.variant && Number.isInteger(i.quantity) && i.quantity > 0 && i.quantity <= 10) : []
  } catch { return [] }
}
async function request(url, options) {
  const response = await fetch(url, options)
  const body = await response.json()
  if (!response.ok) throw new Error(body.error || 'Could not update your bag. Please try again.')
  return body
}
const post = (variantId, quantity) => request('/api/cart', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ variantId, quantity }) })

export function CartProvider({ children }) {
  const { session, loading: authLoading } = useAuth()
  const owner = session?.user?.id || 'guest'
  const [cart, setCart] = useState({ owner: null, items: [], loaded: false })
  const [error, setError] = useState('')
  const current = useRef(cart)
  const queue = useRef(Promise.resolve())
  const activeOwner = useRef(owner)
  useEffect(() => { activeOwner.current = owner }, [owner])

  function commit(items, forOwner) {
    if (activeOwner.current !== forOwner) return
    const next = { owner: forOwner, items, loaded: true }
    current.current = next
    setCart(next)
  }
  async function refresh() {
    const items = owner === 'guest' ? readLocalCart() : (await request('/api/cart')).map(i => ({ variantId: i.variantId, quantity: i.quantity, variant: i.variant }))
    commit(items, owner)
  }
  useEffect(() => {
    if (authLoading) return
    let cancelled = false
    async function load() {
      let fallback = []
      try {
        await Promise.resolve()
        let items
        if (owner === 'guest') items = readLocalCart()
        else {
          const rows = await request('/api/cart')
          items = rows.map(i => ({ variantId: i.variantId, quantity: i.quantity, variant: i.variant }))
          fallback = items
          for (const guest of readLocalCart()) {
            if (items.some(i => i.variantId === guest.variantId)) continue
            await post(guest.variantId, guest.quantity)
          }
          // Keep the guest bag if any merge failed so the customer can retry.
          if (cancelled || activeOwner.current !== owner) return
          localStorage.removeItem(LS_KEY)
          const merged = await request('/api/cart')
          items = merged.map(i => ({ variantId: i.variantId, quantity: i.quantity, variant: i.variant }))
        }
        if (!cancelled) { commit(items, owner); setError('') }
      } catch (err) {
        if (!cancelled) { setError(err.message); commit(owner === 'guest' ? readLocalCart() : fallback, owner) }
      }
    }
    load()
    const syncStorage = event => { if (owner === 'guest' && event.key === LS_KEY) commit(readLocalCart(), owner) }
    window.addEventListener('storage', syncStorage)
    return () => { cancelled = true; window.removeEventListener('storage', syncStorage) }
    // Login identity, rather than token refresh, controls bag initialization.
  }, [owner, authLoading])

  function mutate(change, sync) {
    const forOwner = owner
    const operation = queue.current.catch(() => {}).then(async () => {
      if (activeOwner.current !== forOwner || !current.current.loaded || current.current.owner !== forOwner) return false
      try {
        const items = current.current.items
        const next = change(items)
        if (forOwner === 'guest') localStorage.setItem(LS_KEY, JSON.stringify(next))
        else await sync(next)
        commit(next, forOwner)
        setError('')
        return true
      } catch (err) { setError(err.message); return false }
    })
    queue.current = operation
    return operation
  }
  async function add(variant, quantity = 1) {
    const result = await mutate(items => {
      const prior = items.find(i => i.variantId === variant.id)
      const nextQty = (prior?.quantity || 0) + quantity
      if (!Number.isInteger(nextQty) || nextQty < 1 || nextQty > 10) throw new Error('You can add up to 10 of each item.')
      if (variant.stockQty != null && nextQty > variant.stockQty) throw new Error('This quantity is no longer available.')
      return prior ? items.map(i => i.variantId === variant.id ? { ...i, quantity: nextQty } : i) : [...items, { variantId: variant.id, variant, quantity }]
    }, next => post(variant.id, next.find(i => i.variantId === variant.id).quantity))
    if (result) trackEvent('add_to_cart', { productId: variant.productId || variant.id })
    return result
  }
  const remove = variantId => mutate(items => items.filter(i => i.variantId !== variantId), () => request(`/api/cart?variantId=${encodeURIComponent(variantId)}`, { method: 'DELETE' }))
  const updateQty = (variantId, quantity) => quantity < 1 ? remove(variantId) : mutate(items => {
    if (!Number.isInteger(quantity) || quantity > 10) throw new Error('You can add up to 10 of each item.')
    return items.map(i => i.variantId === variantId ? { ...i, quantity } : i)
  }, () => post(variantId, quantity))
  const clear = () => mutate(() => [], () => request('/api/cart', { method: 'DELETE' }))
  const ready = !authLoading && cart.owner === owner && cart.loaded
  const items = ready ? cart.items : []
  return <CartContext.Provider value={{ items, count: items.reduce((sum, i) => sum + i.quantity, 0), loading: !ready, error, add, remove, updateQty, refresh, clear }}>{children}</CartContext.Provider>
}
export const useCart = () => useContext(CartContext)
