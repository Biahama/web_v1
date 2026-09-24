'use client'

// ============================================================
// PRODUCT PAGE (PDP) EDITOR
// ============================================================
// Two knobs for the page a customer sees when they open one
// product: the big black button's text, and whether the fast
// "pay now" button is shown under it.
// Saved under the 'pdp' settings key.
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
const textInputStyle = {
  width: '100%',
  maxWidth: 360,
  padding: '8px 10px',
  border: '1px solid #e5e5e5',
  borderRadius: 4,
  fontSize: 14,
  fontFamily: 'inherit',
}

export default function PdpEditor({ defaultPdp }) {
  const [pdp, setPdp] = useState({ ...defaultPdp })
  const [loading, setLoading] = useState(true)
  // status = { type: 'idle' | 'saving' | 'success' | 'error', message }
  const [status, setStatus] = useState({ type: 'idle', message: '' })

  // ---- Load the current settings when the page opens. ----
  useEffect(() => {
    fetch('/api/admin/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data?.pdp) setPdp({ ...defaultPdp, ...data.pdp })
      })
      .catch(() => {
        setStatus({ type: 'error', message: 'Could not load current settings — showing defaults.' })
      })
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---- Save: only the 'pdp' key is sent. ----
  async function handleSave() {
    setStatus({ type: 'saving', message: 'Saving…' })
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdp: {
            ...pdp,
            // An empty box means "use the original text".
            addToBagText: pdp.addToBagText.trim() || defaultPdp.addToBagText,
          },
        }),
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
        Product page (PDP)
      </h1>
      {/* Which storefront page this screen controls */}
      <p style={{ ...helpStyle, marginBottom: 32 }}>
        Controls the page a customer sees when they open one product (the photos + size + buy buttons page).
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div>
          <label style={labelStyle}>Buy button text</label>
          <input
            type="text"
            style={{ ...textInputStyle, maxWidth: 280 }}
            value={pdp.addToBagText ?? ''}
            maxLength={40}
            placeholder={defaultPdp.addToBagText}
            onChange={(e) => setPdp((p) => ({ ...p, addToBagText: e.target.value }))}
          />
          <p style={helpStyle}>The big black button. Default: {defaultPdp.addToBagText}</p>
        </div>

        <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={!!pdp.showFastCheckout}
            onChange={(e) => setPdp((p) => ({ ...p, showFastCheckout: e.target.checked }))}
          />
          Show the fast checkout button (pay for one item right away, skipping the cart)
        </label>
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
