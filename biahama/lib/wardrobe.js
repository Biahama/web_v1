'use client'
import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { useAuth } from '@/components/providers/AuthProvider'
import { trackEvent } from '@/lib/analytics-client'

const WardrobeContext = createContext({ savedIds: new Set(), isSaved: () => false, toggle: async () => 'login-required', error: '' })
export function WardrobeProvider({ children }) {
  const { session, loading } = useAuth()
  const owner = session?.user?.id || null
  const [saved, setSaved] = useState({ owner: null, ids: new Set() })
  const [error, setError] = useState('')
  const activeOwner = useRef(owner)
  const pending = useRef(new Set())
  useEffect(() => { activeOwner.current = owner }, [owner])
  useEffect(() => {
    if (loading || !owner) return
    let cancelled = false
    fetch('/api/wardrobe').then(async response => {
      if (!response.ok) throw new Error('Could not load saved items')
      return response.json()
    }).then(items => {
      if (!cancelled) { setSaved({ owner, ids: new Set(items.map(item => item.productId)) }); setError('') }
    }).catch(() => { if (!cancelled) setError('Could not load your wardrobe. Please refresh and try again.') })
    return () => { cancelled = true }
  }, [owner, loading])
  const savedIds = owner && saved.owner === owner ? saved.ids : new Set()
  async function toggle(productId) {
    if (!owner) return 'login-required'
    if (pending.current.has(productId)) return savedIds.has(productId)
    pending.current.add(productId)
    const existed = savedIds.has(productId)
    try {
      const response = await fetch(existed ? `/api/wardrobe?productId=${encodeURIComponent(productId)}` : '/api/wardrobe', existed ? { method: 'DELETE' } : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId }) })
      if (!response.ok) throw new Error('Could not update your wardrobe. Please try again.')
      if (activeOwner.current === owner) {
        setSaved(previous => {
          const ids = new Set(previous.owner === owner ? previous.ids : [])
          if (existed) ids.delete(productId); else ids.add(productId)
          return { owner, ids }
        })
        setError('')
      }
      if (!existed) trackEvent('wardrobe_save', { productId })
      return !existed
    } catch (err) { if (activeOwner.current === owner) setError(err.message); return existed } finally { pending.current.delete(productId) }
  }
  return <WardrobeContext.Provider value={{ savedIds, isSaved: id => savedIds.has(id), toggle, error }}>{children}</WardrobeContext.Provider>
}
export const useWardrobe = () => useContext(WardrobeContext)
