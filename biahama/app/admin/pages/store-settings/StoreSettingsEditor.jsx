'use client'

// ============================================================
// STORE SETTINGS EDITOR — store-wide switches
// ============================================================
// Right now: the loyalty points rate. It lives in the shared
// 'commerce' settings key, so we load the FULL commerce object
// and send the FULL object back — saving here never disturbs
// the Cart & Checkout screen.
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

export default function StoreSettingsEditor({ defaultCommerce }) {
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
        body: JSON.stringify({
          commerce: {
            ...commerce,
            // The number box gives a string; the server wants a number.
            loyaltyPointsPer100: Number(commerce.loyaltyPointsPer100) || 0,
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
        Store settings
      </h1>
      {/* Which part of the store this screen controls */}
      <p style={{ ...helpStyle, marginBottom: 32 }}>
        Store-wide settings that apply to the whole shop, not one page.
      </p>

      <div>
        <label style={labelStyle}>Loyalty points per ₹100</label>
        <input
          type="number"
          min={0}
          max={100}
          style={{
            width: 120,
            padding: '8px 10px',
            border: '1px solid #e5e5e5',
            borderRadius: 4,
            fontSize: 14,
            fontFamily: 'inherit',
          }}
          value={commerce.loyaltyPointsPer100}
          onChange={(e) => setCommerce((c) => ({ ...c, loyaltyPointsPer100: e.target.value }))}
        />
        <p style={helpStyle}>
          Points a customer earns per ₹100 spent. 0 switches the program off.
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
