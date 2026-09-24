'use client'

// ============================================================
// CART & CHECKOUT EDITOR
// ============================================================
// No switches here for now — payment is Razorpay only. Settings live in the
// shared 'commerce' settings key, so we load the FULL commerce
// object and send the FULL object back — saving here never
// disturbs the loyalty setting (edited on Store settings).
// ============================================================

import { useEffect, useState } from 'react'

// ---- Small shared styles (same look as the theme editor) ----
const labelStyle = {
  display: 'block',
  fontSize: 13,
  fontWeight: 500,
  color: '#1A202C',
  marginBottom: 6,
}
const helpStyle = { fontSize: 12, color: '#6f6f6f', marginTop: 4 }

export default function CartCheckoutEditor({ defaultCommerce }) {
  const [commerce, setCommerce] = useState({ ...defaultCommerce })
  const [loading, setLoading] = useState(true)
  // status = { type: 'idle' | 'saving' | 'success' | 'error', message }
  const [status, setStatus] = useState({ type: 'idle', message: '' })

  // ---- Load the current settings when the page opens. ----
  useEffect(() => {
    fetch('/api/admin/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data?.commerce) setCommerce({ ...defaultCommerce, ...data.commerce })
      })
      .catch(() => {
        setStatus({ type: 'error', message: 'Could not load current settings — showing defaults.' })
      })
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---- Save: send the whole commerce object back. ----
  async function handleSave() {
    setStatus({ type: 'saving', message: 'Saving…' })
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commerce }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Could not save — please try again.')
      setStatus({ type: 'success', message: 'Saved — live' })
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
    }
  }

  if (loading) {
    return <p style={{ color: '#6f6f6f', fontSize: 14 }}>Loading current settings…</p>
  }

  return (
    <div style={{ maxWidth: 720, paddingBottom: 100 }}>
      <h1 style={{ fontFamily: 'var(--font-display), serif', fontSize: 32, fontWeight: 500, color: '#1A202C', margin: 0 }}>
        Cart &amp; Checkout
      </h1>
      {/* Which storefront page this screen controls */}
      <p style={{ ...helpStyle, marginBottom: 32 }}>
        Controls the shopping bag and the checkout page where customers pay.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Pricing rules are deliberately NOT editable here. */}
        <p style={{ ...helpStyle, maxWidth: 520 }}>
          Note: pricing rules (like the free-shipping threshold) live in the code
          for safety — a typo there could give away free shipping on everything.
          Ask your developer if you need those changed.
        </p>
      </div>

      {/* ================= STICKY SAVE BAR ================= */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 220, /* clears the admin sidebar */
          right: 0,
          background: '#ffffff',
          borderTop: '1px solid #e5e5e5',
          padding: '14px 32px',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          zIndex: 10,
        }}
      >
        <button
          onClick={handleSave}
          disabled={status.type === 'saving'}
          style={{
            background: '#1A202C',
            color: '#ffffff',
            border: 'none',
            borderRadius: 4,
            padding: '10px 24px',
            fontSize: 14,
            fontFamily: 'inherit',
            cursor: status.type === 'saving' ? 'wait' : 'pointer',
          }}
        >
          {status.type === 'saving' ? 'Saving…' : 'Save changes'}
        </button>

        {status.type === 'success' && (
          <span style={{ color: '#2F855A', fontSize: 13 }}>{status.message}</span>
        )}
        {status.type === 'error' && (
          <span style={{ color: '#C53030', fontSize: 13 }}>{status.message}</span>
        )}
      </div>
    </div>
  )
}
