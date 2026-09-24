'use client'

// ============================================================
// LANDING PAGE EDITOR — the homepage, no code needed
// ============================================================
// Everything here is saved under the 'layout' settings key.
// We load the FULL layout first and send the FULL layout back,
// so saving this page never wipes settings edited elsewhere.
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
const sectionStyle = { marginBottom: 36 }
const sectionTitleStyle = {
  fontSize: 16,
  fontWeight: 500,
  color: '#1A202C',
  borderBottom: '1px solid #e5e5e5',
  paddingBottom: 8,
  marginBottom: 16,
}

export default function LandingEditor({ defaultLayout }) {
  const [layout, setLayout] = useState({ ...defaultLayout })
  const [loading, setLoading] = useState(true)
  // status = { type: 'idle' | 'saving' | 'success' | 'error', message }
  const [status, setStatus] = useState({ type: 'idle', message: '' })

  // ---- Load the current settings when the page opens. ----
  useEffect(() => {
    fetch('/api/admin/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data?.layout) setLayout({ ...defaultLayout, ...data.layout })
      })
      .catch(() => {
        setStatus({ type: 'error', message: 'Could not load current settings — showing defaults.' })
      })
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setField = (key, value) => setLayout((prev) => ({ ...prev, [key]: value }))

  // ---- Save: send the whole layout back to the server. ----
  async function handleSave() {
    setStatus({ type: 'saving', message: 'Saving…' })
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          layout: {
            ...layout,
            // Sliders give strings; the server expects numbers.
            heroFocalX: Number(layout.heroFocalX),
            heroFocalY: Number(layout.heroFocalY),
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
        Landing page
      </h1>
      {/* Which storefront page this screen controls */}
      <p style={{ ...helpStyle, marginBottom: 32 }}>
        Controls the homepage — the first page customers see at biahama.com.
      </p>

      {/* ================= ANNOUNCEMENT BAR ================= */}
      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>Announcement bar</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={!!layout.showAnnouncementBar}
              onChange={(e) => setField('showAnnouncementBar', e.target.checked)}
            />
            Show the announcement bar (the thin strip at the very top)
          </label>
          <div>
            <label style={labelStyle}>Announcement bar text</label>
            <input
              type="text"
              style={{ ...textInputStyle, maxWidth: 560 }}
              value={layout.announcementText ?? ''}
              maxLength={300}
              onChange={(e) => setField('announcementText', e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* ================= HERO ================= */}
      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>Big homepage photo (hero)</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Headline — a textarea so Enter makes a line break */}
          <div>
            <label style={labelStyle}>Headline</label>
            <textarea
              rows={2}
              style={{ ...textInputStyle, maxWidth: 560, resize: 'vertical' }}
              value={layout.heroHeadline ?? ''}
              maxLength={200}
              onChange={(e) => setField('heroHeadline', e.target.value)}
            />
            <p style={helpStyle}>Press Enter to start a new line on the homepage.</p>
          </div>

          <div>
            <label style={labelStyle}>Button text</label>
            <input
              type="text"
              style={{ ...textInputStyle, maxWidth: 240 }}
              value={layout.heroButtonText ?? ''}
              maxLength={60}
              onChange={(e) => setField('heroButtonText', e.target.value)}
            />
          </div>

          {/* Focal point sliders */}
          <div>
            <label style={labelStyle}>
              Photo focus point (left-right): {layout.heroFocalX}
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={layout.heroFocalX}
              onChange={(e) => setField('heroFocalX', Number(e.target.value))}
              style={{ width: 280 }}
            />
          </div>
          <div>
            <label style={labelStyle}>
              Photo focus point (up-down): {layout.heroFocalY}
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={layout.heroFocalY}
              onChange={(e) => setField('heroFocalY', Number(e.target.value))}
              style={{ width: 280 }}
            />
            <p style={helpStyle}>
              Controls which part of the big homepage photo stays visible on small screens.
            </p>
          </div>
        </div>
      </section>

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
