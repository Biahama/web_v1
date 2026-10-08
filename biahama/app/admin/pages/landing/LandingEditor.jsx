'use client'

// ============================================================
// LANDING PAGE EDITOR — the homepage, no code needed
// ============================================================
// Everything here is saved under the 'layout' settings key.
// We load the FULL layout first and send the FULL layout back,
// so saving this page never wipes settings edited elsewhere.
// ============================================================

import { useEffect, useState } from 'react'
import CampaignHero from '@/components/layout/CampaignHero'

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
  const [uploading, setUploading] = useState(null)
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

  const setField = (key, value) => {
    setLayout((prev) => ({ ...prev, [key]: value }))
    setStatus({ type: 'idle', message: '' })
  }

  async function handleUpload(event, key) {
    const input = event.currentTarget
    const file = input.files?.[0]
    if (!file) return
    setUploading(key)
    setStatus({ type: 'idle', message: '' })
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/admin/upload', { method: 'POST', body: form })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.url) throw new Error(data?.error || 'Could not upload the image. Please try again.')
      setField(key, data.url)
      setStatus({ type: 'success', message: 'Image uploaded. Save changes to publish it.' })
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
    } finally {
      setUploading(null)
      input.value = ''
    }
  }

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
            heroMobileFocalX: Number(layout.heroMobileFocalX),
            heroMobileFocalY: Number(layout.heroMobileFocalY),
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
    <div style={{ maxWidth: 1040, paddingBottom: 100 }}>
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
            <label htmlFor="hero-headline" style={labelStyle}>Headline</label>
            <textarea
              id="hero-headline"
              rows={2}
              style={{ ...textInputStyle, maxWidth: 560, resize: 'vertical' }}
              value={layout.heroHeadline ?? ''}
              maxLength={200}
              onChange={(e) => setField('heroHeadline', e.target.value)}
            />
            <p style={helpStyle}>Press Enter to start a new line on the homepage.</p>
          </div>

          <div>
            <label htmlFor="hero-button-text" style={labelStyle}>Button text</label>
            <input
              type="text"
              style={{ ...textInputStyle, maxWidth: 240 }}
              id="hero-button-text"
              value={layout.heroButtonText ?? ''}
              maxLength={60}
              onChange={(e) => setField('heroButtonText', e.target.value)}
            />
          </div>

          <label style={labelStyle}>
            Image description
            <input style={{ ...textInputStyle, display: 'block', maxWidth: 560, marginTop: 6 }} value={layout.heroImageAlt ?? ''} maxLength={200} onChange={e => setField('heroImageAlt', e.target.value)} />
            <span style={{ ...helpStyle, display: 'block' }}>A short description of the campaign for customers using screen readers.</span>
          </label>

          <div className="hero-image-controls">
            {[
              { title: 'Desktop image', key: 'heroDesktopImage', x: 'heroFocalX', y: 'heroFocalY', help: 'Choose a landscape photograph. Leave blank to use the original campaign.' },
              { title: 'Mobile image', key: 'heroMobileImage', x: 'heroMobileFocalX', y: 'heroMobileFocalY', help: 'Choose a portrait crop of the same campaign. Leave blank to use the desktop image.' },
            ].map(({ title, key, x, y, help }) => <fieldset key={key} className="hero-image-control">
              <legend>{title}</legend>
              <label style={labelStyle}>
                Cloudinary image URL
                <input type="url" style={{ ...textInputStyle, display: 'block', maxWidth: '100%', marginTop: 6 }} value={layout[key] ?? ''} maxLength={1000} onChange={e => setField(key, e.target.value)} disabled={!!uploading || status.type === 'saving'} />
              </label>
              <p style={helpStyle}>{help}</p>
              <label className="hero-upload-label">
                {uploading === key ? 'Uploading…' : 'Upload image'}
                <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={e => handleUpload(e, key)} disabled={!!uploading || status.type === 'saving'} />
              </label>
              <button type="button" className="text-action" onClick={() => setField(key, '')} disabled={!layout[key] || !!uploading || status.type === 'saving'}>
                {key === 'heroDesktopImage' ? 'Use original campaign' : 'Use desktop image'}
              </button>
              <label className="hero-focus-label">
                Left–right focus: {layout[x]}%
                <input type="range" min="0" max="100" value={layout[x]} onChange={e => setField(x, Number(e.target.value))} />
              </label>
              <label className="hero-focus-label">
                Up–down focus: {layout[y]}%
                <input type="range" min="0" max="100" value={layout[y]} onChange={e => setField(y, Number(e.target.value))} />
              </label>
            </fieldset>)}
          </div>

          <div>
            <h3 style={{ ...labelStyle, marginBottom: 8 }}>Preview your campaign</h3>
            <p style={{ ...helpStyle, marginBottom: 16 }}>Changes appear here before saving. These sample frames show the photo and caption; check the storefront for the navigation and other screen sizes.</p>
            <div className="hero-preview-grid">
              <figure><figcaption>Desktop · 16:9</figcaption><CampaignHero layout={layout} preview="desktop" /></figure>
              <figure><figcaption>Mobile · 9:19.5</figcaption><CampaignHero layout={layout} preview="mobile" /></figure>
            </div>
          </div>
        </div>
      </section>

      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>Collection introduction & brand story</h2>
        <p style={helpStyle}>The sections below the campaign photo. Your fonts and imagery stay consistent.</p>
        <div style={{ display: 'grid', gap: 20, marginTop: 20 }}>
          {[
            ['collectionEyebrow', 'Collection small heading', 80],
            ['collectionHeadline', 'Collection headline', 200],
            ['collectionDescription', 'Collection description', 600],
            ['storyEyebrow', 'Story small heading', 80],
            ['storyHeadline', 'Story headline', 200],
            ['storyDescription', 'Story description', 600],
          ].map(([key, label, maxLength]) => <label key={key} style={labelStyle}>
            {label}
            <input style={{ ...textInputStyle, display: 'block', maxWidth: 560, marginTop: 6 }} value={layout[key] ?? ''} maxLength={maxLength} onChange={e => setField(key, e.target.value)} />
          </label>)}
        </div>
      </section>

      {/* ================= STICKY SAVE BAR ================= */}
      <div
        className="admin-save-bar"
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
          disabled={status.type === 'saving' || !!uploading}
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

        <div role="status" aria-live="polite">
        {status.type === 'success' && (
          <span style={{ color: '#2F855A', fontSize: 13 }}>{status.message}</span>
        )}
        {status.type === 'error' && (
          <span style={{ color: '#C53030', fontSize: 13 }}>{status.message}</span>
        )}
        </div>
      </div>
    </div>
  )
}
