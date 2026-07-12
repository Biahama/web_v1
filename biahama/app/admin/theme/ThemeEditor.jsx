'use client'

// ============================================================
// THEME & LAYOUT EDITOR — change how the site looks, no code
// ============================================================
// HOW IT WORKS:
// - The site's real design is baked in as DEFAULTS.
// - Anything you set here is saved as an OVERRIDE on top.
// - An EMPTY field means "use the original design value".
// - A wrong value (e.g. a typo'd size) is simply ignored by
//   the browser — the site falls back to the default. Nothing
//   here can crash the live site.
// ============================================================

import { useEffect, useState } from 'react'

// ---- Small shared styles ----
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

// Is this a full hex color like #1A202C? (color pickers need one)
const isHex = (v) => /^#[0-9a-fA-F]{6}$/.test(v)

export default function ThemeEditor({ tokens, defaultFonts, defaultLayout }) {
  // What the admin has typed. Empty string = "use the default".
  const [fonts, setFonts] = useState({ display: '', ui: '' })
  const [overrides, setOverrides] = useState({})
  const [layout, setLayout] = useState({ ...defaultLayout })

  const [loading, setLoading] = useState(true)
  // status = { type: 'idle' | 'saving' | 'success' | 'error', message }
  const [status, setStatus] = useState({ type: 'idle', message: '' })

  // ---- Load the current settings when the page opens. ----
  useEffect(() => {
    fetch('/api/admin/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data?.theme) {
          setFonts({
            display: data.theme.fonts?.display ?? defaultFonts.display,
            ui: data.theme.fonts?.ui ?? defaultFonts.ui,
          })
          setOverrides(data.theme.overrides ?? {})
        }
        if (data?.layout) setLayout({ ...defaultLayout, ...data.layout })
      })
      .catch(() => {
        setStatus({ type: 'error', message: 'Could not load current settings — showing defaults.' })
      })
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---- Helpers to change one value at a time. ----
  const setOverride = (varName, value) =>
    setOverrides((prev) => ({ ...prev, [varName]: value }))
  const setLayoutField = (key, value) =>
    setLayout((prev) => ({ ...prev, [key]: value }))

  // ---- Send settings to the server. ----
  async function put(payload, successMessage) {
    setStatus({ type: 'saving', message: 'Saving…' })
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Could not save — please try again.')
      setStatus({ type: 'success', message: successMessage })
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
    }
  }

  // "Save changes": send exactly what is on screen.
  function handleSave() {
    // Only keep overrides that actually have a value typed in.
    const cleanOverrides = {}
    for (const [name, value] of Object.entries(overrides)) {
      if (String(value).trim() !== '') cleanOverrides[name] = String(value).trim()
    }
    put(
      {
        theme: {
          overrides: cleanOverrides,
          fonts: {
            // Empty font box = go back to the original font.
            display: fonts.display.trim() || defaultFonts.display,
            ui: fonts.ui.trim() || defaultFonts.ui,
          },
        },
        layout: {
          ...layout,
          // Sliders give strings; the server expects numbers.
          heroFocalX: Number(layout.heroFocalX),
          heroFocalY: Number(layout.heroFocalY),
        },
      },
      'Saved — the live site is updated'
    )
  }

  // "Restore defaults": wipe every override, back to the original design.
  function handleRestore() {
    const sure = confirm(
      'Restore the original design? All your theme and layout changes will be removed.'
    )
    if (!sure) return
    setFonts({ ...defaultFonts })
    setOverrides({})
    setLayout({ ...defaultLayout })
    put(
      {
        theme: { overrides: {}, fonts: { ...defaultFonts } },
        layout: { ...defaultLayout },
      },
      'Original design restored — the live site is updated'
    )
  }

  // Group the editable tokens by their section name, keeping order.
  const groups = []
  for (const token of tokens) {
    let group = groups.find((g) => g.name === token.group)
    if (!group) {
      group = { name: token.group, tokens: [] }
      groups.push(group)
    }
    group.tokens.push(token)
  }

  if (loading) {
    return <p style={{ color: '#6f6f6f', fontSize: 14 }}>Loading current settings…</p>
  }

  return (
    <div style={{ maxWidth: 720, paddingBottom: 100 }}>
      <h1 style={{ fontFamily: 'var(--font-display), serif', fontSize: 32, fontWeight: 500, color: '#1A202C', margin: 0 }}>
        Theme &amp; Layout
      </h1>
      <p style={{ ...helpStyle, marginBottom: 8 }}>
        Empty fields mean &ldquo;use the original design value&rdquo;. A wrong value can never
        crash the site — the browser just ignores it.
      </p>
      <div style={{ marginBottom: 32 }} />

      {/* ================= FONTS ================= */}
      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>Fonts</h2>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 260px' }}>
            <label style={labelStyle}>Headings font</label>
            <input
              type="text"
              style={textInputStyle}
              value={fonts.display}
              placeholder={defaultFonts.display}
              onChange={(e) => setFonts((f) => ({ ...f, display: e.target.value }))}
            />
          </div>
          <div style={{ flex: '1 1 260px' }}>
            <label style={labelStyle}>Everything-else font</label>
            <input
              type="text"
              style={textInputStyle}
              value={fonts.ui}
              placeholder={defaultFonts.ui}
              onChange={(e) => setFonts((f) => ({ ...f, ui: e.target.value }))}
            />
          </div>
        </div>
        <p style={helpStyle}>
          Type any font name from fonts.google.com — e.g. Inter, Lora, Playfair Display
        </p>
      </section>

      {/* ================= DESIGN TOKENS ================= */}
      {groups.map((group) => (
        <section key={group.name} style={sectionStyle}>
          <h2 style={sectionTitleStyle}>{group.name}</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {group.tokens.map((token) => {
              const value = overrides[token.var] ?? ''
              if (token.type === 'color') {
                // Color picker + a text box showing the hex, kept in sync.
                const pickerValue = isHex(value) ? value : token.default
                return (
                  <div key={token.var}>
                    <label style={labelStyle}>{token.label}</label>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <input
                        type="color"
                        value={pickerValue}
                        onChange={(e) => setOverride(token.var, e.target.value)}
                        style={{ width: 44, height: 34, padding: 2, border: '1px solid #e5e5e5', borderRadius: 4, cursor: 'pointer' }}
                      />
                      <input
                        type="text"
                        value={value}
                        placeholder={token.default}
                        onChange={(e) => setOverride(token.var, e.target.value)}
                        style={{ ...textInputStyle, maxWidth: 140 }}
                      />
                    </div>
                  </div>
                )
              }
              // 'size' and 'text' knobs are simple text fields.
              return (
                <div key={token.var}>
                  <label style={labelStyle}>{token.label}</label>
                  <input
                    type="text"
                    value={value}
                    placeholder={token.default}
                    onChange={(e) => setOverride(token.var, e.target.value)}
                    style={{ ...textInputStyle, maxWidth: 200 }}
                  />
                </div>
              )
            })}
          </div>
        </section>
      ))}

      {/* ================= LAYOUT & TEXT ================= */}
      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>Layout &amp; text</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Announcement bar on/off + its text */}
          <div>
            <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={!!layout.showAnnouncementBar}
                onChange={(e) => setLayoutField('showAnnouncementBar', e.target.checked)}
              />
              Show the announcement bar (the thin strip at the very top)
            </label>
          </div>
          <div>
            <label style={labelStyle}>Announcement bar text</label>
            <input
              type="text"
              style={{ ...textInputStyle, maxWidth: 560 }}
              value={layout.announcementText ?? ''}
              maxLength={300}
              onChange={(e) => setLayoutField('announcementText', e.target.value)}
            />
          </div>

          {/* Hero headline — a textarea so Enter makes a line break */}
          <div>
            <label style={labelStyle}>Homepage headline</label>
            <textarea
              rows={2}
              style={{ ...textInputStyle, maxWidth: 560, resize: 'vertical' }}
              value={layout.heroHeadline ?? ''}
              maxLength={200}
              onChange={(e) => setLayoutField('heroHeadline', e.target.value)}
            />
            <p style={helpStyle}>Press Enter to start a new line on the homepage.</p>
          </div>

          <div>
            <label style={labelStyle}>Homepage button text</label>
            <input
              type="text"
              style={{ ...textInputStyle, maxWidth: 240 }}
              value={layout.heroButtonText ?? ''}
              maxLength={60}
              onChange={(e) => setLayoutField('heroButtonText', e.target.value)}
            />
          </div>

          {/* Hero focal point sliders */}
          <div>
            <label style={labelStyle}>
              Hero image focus point (left-right): {layout.heroFocalX}
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={layout.heroFocalX}
              onChange={(e) => setLayoutField('heroFocalX', Number(e.target.value))}
              style={{ width: 280 }}
            />
          </div>
          <div>
            <label style={labelStyle}>
              Hero image focus point (up-down): {layout.heroFocalY}
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={layout.heroFocalY}
              onChange={(e) => setLayoutField('heroFocalY', Number(e.target.value))}
              style={{ width: 280 }}
            />
            <p style={helpStyle}>
              Controls which part of the big homepage photo stays visible on small screens.
            </p>
          </div>

          {/* Collection banner side */}
          <div>
            <span style={labelStyle}>Collection page banner position</span>
            <label style={{ marginRight: 20, fontSize: 14, cursor: 'pointer' }}>
              <input
                type="radio"
                name="collectionBannerSide"
                checked={layout.collectionBannerSide === 'right'}
                onChange={() => setLayoutField('collectionBannerSide', 'right')}
                style={{ marginRight: 6 }}
              />
              Right
            </label>
            <label style={{ fontSize: 14, cursor: 'pointer' }}>
              <input
                type="radio"
                name="collectionBannerSide"
                checked={layout.collectionBannerSide === 'left'}
                onChange={() => setLayoutField('collectionBannerSide', 'left')}
                style={{ marginRight: 6 }}
              />
              Left
            </label>
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
        <button
          onClick={handleRestore}
          disabled={status.type === 'saving'}
          style={{
            background: 'transparent',
            color: '#1A202C',
            border: '1px solid #e5e5e5',
            borderRadius: 4,
            padding: '10px 20px',
            fontSize: 14,
            fontFamily: 'inherit',
            cursor: 'pointer',
          }}
        >
          Restore defaults
        </button>

        {/* Save result message */}
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
