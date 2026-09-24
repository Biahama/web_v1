'use client'

// ============================================================
// COLLECTION PAGES EDITOR — one tab per category
// ============================================================
// Each category (Kurta, Shirts, Tunics, Pant) has two knobs:
// - which SIDE the big campaign banner sits on (left/right)
// - an optional CUSTOM banner photo. Empty = "automatic":
//   the shop picks a product photo by itself.
// Everything is saved under the 'collections' settings key.
// We always send all four categories back, with the edited one
// merged in, so saving one tab never wipes the others.
// ============================================================

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'

// ---- Small shared styles (same look as the theme editor) ----
const labelStyle = {
  display: 'block',
  fontSize: 13,
  fontWeight: 500,
  color: '#1A202C',
  marginBottom: 6,
}
const helpStyle = { fontSize: 12, color: '#6f6f6f', marginTop: 4 }

// Friendly tab names for each category slug.
const TABS = [
  { slug: 'kurtas', label: 'Kurta' },
  { slug: 'shirts', label: 'Shirts' },
  { slug: 'tunics', label: 'Tunics' },
  { slug: 'trousers', label: 'Pant' },
]

export default function CollectionsEditor({ cat, defaultCollections }) {
  // All four categories live in state; 'cat' picks which is shown.
  const [collections, setCollections] = useState({ ...defaultCollections })
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  // status = { type: 'idle' | 'saving' | 'success' | 'error', message }
  const [status, setStatus] = useState({ type: 'idle', message: '' })
  const fileInputRef = useRef(null)

  // ---- Load the current settings when the page opens. ----
  useEffect(() => {
    fetch('/api/admin/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data?.collections) {
          // Merge each saved category over its defaults.
          const merged = {}
          for (const slug of Object.keys(defaultCollections)) {
            merged[slug] = { ...defaultCollections[slug], ...(data.collections[slug] ?? {}) }
          }
          setCollections(merged)
        }
      })
      .catch(() => {
        setStatus({ type: 'error', message: 'Could not load current settings — showing defaults.' })
      })
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const current = collections[cat] ?? defaultCollections[cat]

  // Change one field of the currently open category.
  const setField = (key, value) =>
    setCollections((prev) => ({ ...prev, [cat]: { ...prev[cat], [key]: value } }))

  // ---- Upload a custom banner photo. ----
  // No productId is sent, so the API treats it as a site image
  // and just returns the hosted URL.
  async function handleFileChosen(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setStatus({ type: 'idle', message: '' })
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/admin/upload', { method: 'POST', body: form })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.url) throw new Error(data?.error || 'Upload failed — please try again.')
      setField('bannerImage', data.url)
      setStatus({ type: 'success', message: 'Photo uploaded — press Save changes to make it live.' })
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
    } finally {
      setUploading(false)
      // Let the same file be picked again later.
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // ---- Save: send ALL four categories with the edits merged in. ----
  async function handleSave() {
    setStatus({ type: 'saving', message: 'Saving…' })
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collections }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Could not save — please try again.')
      setStatus({ type: 'success', message: 'Saved — live' })
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
    }
  }

  const activeTab = TABS.find((t) => t.slug === cat) ?? TABS[0]

  if (loading) {
    return <p style={{ color: '#6f6f6f', fontSize: 14 }}>Loading current settings…</p>
  }

  return (
    <div style={{ maxWidth: 720, paddingBottom: 100 }}>
      <h1 style={{ fontFamily: 'var(--font-display), serif', fontSize: 32, fontWeight: 500, color: '#1A202C', margin: 0 }}>
        Collections
      </h1>
      {/* Which storefront page this screen controls */}
      <p style={{ ...helpStyle, marginBottom: 24 }}>
        Controls the shop pages customers browse — /shop?cat={cat} on the live site.
      </p>

      {/* ---- Tab row: one tab per category ---- */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid #e5e5e5', marginBottom: 28 }}>
        {TABS.map((tab) => (
          <Link
            key={tab.slug}
            href={`/admin/pages/collections?cat=${tab.slug}`}
            style={{
              padding: '10px 18px',
              fontSize: 13,
              textDecoration: 'none',
              color: tab.slug === cat ? '#1A202C' : '#6f6f6f',
              fontWeight: tab.slug === cat ? 600 : 400,
              borderBottom: tab.slug === cat ? '2px solid #1A202C' : '2px solid transparent',
              marginBottom: -1,
            }}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* ---- Banner side ---- */}
      <div style={{ marginBottom: 32 }}>
        <span style={labelStyle}>Where does the big banner sit on the {activeTab.label} page?</span>
        <label style={{ marginRight: 20, fontSize: 14, cursor: 'pointer' }}>
          <input
            type="radio"
            name="bannerSide"
            checked={current.bannerSide === 'right'}
            onChange={() => setField('bannerSide', 'right')}
            style={{ marginRight: 6 }}
          />
          Right of the products
        </label>
        <label style={{ fontSize: 14, cursor: 'pointer' }}>
          <input
            type="radio"
            name="bannerSide"
            checked={current.bannerSide === 'left'}
            onChange={() => setField('bannerSide', 'left')}
            style={{ marginRight: 6 }}
          />
          Left of the products
        </label>
      </div>

      {/* ---- Banner photo ---- */}
      <div style={{ marginBottom: 32 }}>
        <span style={labelStyle}>Banner photo</span>

        {/* Current photo (or the "automatic" placeholder) */}
        {current.bannerImage ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={current.bannerImage}
            alt={`${activeTab.label} banner`}
            style={{ width: 220, height: 275, objectFit: 'cover', border: '1px solid #e5e5e5', display: 'block', marginBottom: 12 }}
          />
        ) : (
          <div
            style={{
              width: 220,
              height: 275,
              background: '#f2f2f2',
              border: '1px solid #e5e5e5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              fontSize: 12,
              color: '#6f6f6f',
              padding: 16,
              marginBottom: 12,
            }}
          >
            Automatic — the shop picks a product photo by itself.
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChosen}
            disabled={uploading}
            style={{ fontSize: 13 }}
          />
          <button
            onClick={() => setField('bannerImage', '')}
            disabled={uploading || !current.bannerImage}
            style={{
              background: 'transparent',
              color: '#1A202C',
              border: '1px solid #e5e5e5',
              borderRadius: 4,
              padding: '8px 16px',
              fontSize: 13,
              fontFamily: 'inherit',
              cursor: current.bannerImage ? 'pointer' : 'default',
              opacity: current.bannerImage ? 1 : 0.5,
            }}
          >
            Use automatic product photo
          </button>
        </div>
        <p style={helpStyle}>
          {uploading
            ? 'Uploading photo…'
            : 'Upload your own photo, or leave it automatic. Tall photos (like product shots) look best.'}
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
          disabled={status.type === 'saving' || uploading}
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
