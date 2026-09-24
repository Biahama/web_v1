'use client'

// ============================================================
// WARDROBE (saved items) — shared state for the hanger buttons.
// Works like the cart provider: loads once after login, and all
// product cards read/update the same list so they stay in sync.
// ============================================================

import { createContext, useContext, useState, useEffect } from 'react'
import { useAuth } from '@/components/providers/AuthProvider'
import { trackEvent } from '@/lib/analytics-client'

const WardrobeContext = createContext({
  savedIds: new Set(),
  isSaved: () => false,
  toggle: async () => 'login-required',
})

export function WardrobeProvider({ children }) {
  const { session, loading } = useAuth()
  const [savedIds, setSavedIds] = useState(new Set())

  // Load the saved list once the login state is known.
  useEffect(() => {
    if (loading) return
    if (!session) {
      setSavedIds(new Set())
      return
    }
    fetch('/api/wardrobe')
      .then((r) => r.json())
      .then((items) => setSavedIds(new Set(items.map((i) => i.productId))))
      .catch((err) => console.error('[wardrobe] Could not load saved items:', err))
  }, [session, loading])

  function isSaved(productId) {
    return savedIds.has(productId)
  }

  /**
   * Save/unsave a product. Returns:
   *  'login-required' — not logged in (the caller sends them to login)
   *  true  — now saved
   *  false — now removed
   */
  async function toggle(productId) {
    if (!session) return 'login-required'

    const currentlySaved = savedIds.has(productId)

    // Update the UI instantly, then tell the server.
    setSavedIds((prev) => {
      const next = new Set(prev)
      currentlySaved ? next.delete(productId) : next.add(productId)
      return next
    })

    try {
      const res = currentlySaved
        ? await fetch(`/api/wardrobe?productId=${productId}`, { method: 'DELETE' })
        : await fetch('/api/wardrobe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId }),
          })
      if (!res.ok) throw new Error(`server said ${res.status}`)
      // Count saves (not removes) for the admin Analytics page.
      if (!currentlySaved) trackEvent('wardrobe_save', { productId })
    } catch (err) {
      // Server failed — put the UI back the way it was.
      console.error('[wardrobe] Could not update saved items:', err)
      setSavedIds((prev) => {
        const next = new Set(prev)
        currentlySaved ? next.add(productId) : next.delete(productId)
        return next
      })
    }

    return !currentlySaved
  }

  return (
    <WardrobeContext.Provider value={{ savedIds, isSaved, toggle }}>
      {children}
    </WardrobeContext.Provider>
  )
}

export function useWardrobe() {
  return useContext(WardrobeContext)
}
