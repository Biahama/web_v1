'use client'

// ============================================================
// MY WARDROBE — the products a customer saved with the hanger
// button. (The navbar links here; it used to 404.)
// ============================================================

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/components/providers/AuthProvider'
import ProductCard from '@/components/ui/ProductCard'

export default function WardrobePage() {
  const { session, loading: authLoading } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return
    if (!session) {
      // Not logged in — open the login drawer on the homepage.
      window.location.href = '/?login=true'
      return
    }
    fetch('/api/wardrobe')
      .then((r) => r.json())
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch((err) => console.error('[wardrobe page] Could not load:', err))
      .finally(() => setLoading(false))
  }, [session, authLoading])

  // Shape each saved product the way ProductCard expects
  // (same shape the shop page produces).
  const products = items
    .filter((i) => i.product)
    .map(({ product: p }) => {
      const prices = p.variants.map((v) => v.price)
      const inStockVariant = p.variants.find((v) => v.stockQty > 0) || p.variants[0]
      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        category: p.category,
        image: p.images[0]?.url ?? null,
        altText: p.images[0]?.altText ?? p.name,
        price: prices.length ? Math.min(...prices) : 0,
        inStock: p.variants.some((v) => v.stockQty > 0),
        firstVariantId: inStockVariant?.id ?? null,
        variants: p.variants,
      }
    })

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '140px 24px 96px' }}>
      <h1
        style={{
          fontFamily: 'var(--font-display)',
          fontStyle: 'italic',
          fontSize: 38,
          fontWeight: 300,
          color: '#262626',
          textAlign: 'center',
          margin: '0 0 8px 0',
        }}
      >
        My Wardrobe
      </h1>
      <p style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: '#6f6f6f', textAlign: 'center', margin: '0 0 48px 0' }}>
        Pieces you&apos;ve saved with the hanger button. Tap the hanger again to remove one.
      </p>

      {loading ? (
        <p style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: '#6f6f6f', textAlign: 'center' }}>Loading…</p>
      ) : products.length === 0 ? (
        <div style={{ textAlign: 'center', fontFamily: 'var(--font-ui)' }}>
          <p style={{ fontSize: 14, color: '#6f6f6f', marginBottom: 20 }}>Your wardrobe is empty.</p>
          <Link
            href="/shop"
            style={{ fontSize: 13, letterSpacing: 1.5, textTransform: 'uppercase', color: '#262626', textDecoration: 'underline' }}
          >
            Explore the Collection →
          </Link>
        </div>
      ) : (
        <div
          className="grid grid-cols-2 lg:grid-cols-3"
          style={{ columnGap: 'var(--grid-col-gap)', rowGap: 'var(--grid-row-gap)' }}
        >
          {products.map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} />
          ))}
        </div>
      )}
    </div>
  )
}
