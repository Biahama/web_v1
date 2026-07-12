'use client'

// ============================================================
// ADMIN — PAGES & TEXT EDITOR (/admin/content)
// ============================================================
// Edit the words on the site's info pages (About, Shipping...).
// Pick a page on the left, edit on the right, press Save — the
// live page updates right away. "Restore original text" brings
// back the built-in default.
// (Admin access itself is checked by app/admin/layout.jsx.)
// ============================================================

import { useEffect, useState } from 'react'

// Shared look for buttons and inputs
const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid #e5e5e5',
  borderRadius: '4px',
  fontFamily: 'Jost, sans-serif',
  fontSize: '14px',
  color: '#1A202C',
  outline: 'none',
  boxSizing: 'border-box',
}

export default function AdminContentPage() {
  const [pages, setPages] = useState([])          // all 8 pages from the API
  const [selectedSlug, setSelectedSlug] = useState(null)
  const [title, setTitle] = useState('')          // what's typed in the editor
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)    // { kind: 'ok' | 'error', text }

  // Load all pages once when the screen opens.
  useEffect(() => {
    loadPages()
  }, [])

  async function loadPages(keepSlug) {
    try {
      const res = await fetch('/api/admin/content')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not load pages')
      setPages(data.pages)

      // Keep the same page selected after a save, or pick the first one.
      const slug = keepSlug || data.pages[0]?.slug
      const page = data.pages.find((p) => p.slug === slug)
      if (page) selectPage(page)
    } catch (err) {
      setMessage({ kind: 'error', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  // Put a page's text into the editor on the right.
  function selectPage(page) {
    setSelectedSlug(page.slug)
    setTitle(page.title)
    setBody(page.body)
    setMessage(null)
  }

  // Save the current text (PUT) — the live page updates immediately.
  async function handleSave() {
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch('/api/admin/content', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: selectedSlug, title, body }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not save')
      setMessage({ kind: 'ok', text: 'Saved — live' })
      await loadPages(selectedSlug) // refresh the "edited" pills
    } catch (err) {
      setMessage({ kind: 'error', text: err.message })
    } finally {
      setSaving(false)
    }
  }

  // Delete the edit (DELETE) — the built-in default text comes back.
  async function handleRestore() {
    const sure = confirm(
      'Restore the original text for this page? Your edited version will be removed.'
    )
    if (!sure) return

    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch(`/api/admin/content?slug=${selectedSlug}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not restore')
      setMessage({ kind: 'ok', text: 'Original text restored — live' })
      await loadPages(selectedSlug)
    } catch (err) {
      setMessage({ kind: 'error', text: err.message })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <p style={{ fontFamily: 'Jost, sans-serif', fontSize: '14px', color: '#6f6f6f', padding: '24px' }}>
        Loading pages…
      </p>
    )
  }

  return (
    <div style={{ fontFamily: 'Jost, sans-serif', color: '#1A202C' }}>
      <h1 style={{ fontSize: '22px', fontWeight: 500, marginBottom: '4px' }}>Pages &amp; Text</h1>
      <p style={{ fontSize: '13px', color: '#6f6f6f', marginBottom: '24px' }}>
        Edit the words on your info pages. Changes go live the moment you save.
      </p>

      <div style={{ display: 'flex', gap: '32px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* LEFT: the list of pages */}
        <div style={{ width: '240px', flexShrink: 0 }}>
          {pages.map((p) => (
            <button
              key={p.slug}
              onClick={() => selectPage(p)}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                width: '100%',
                padding: '10px 12px',
                marginBottom: '4px',
                border: '1px solid ' + (p.slug === selectedSlug ? '#1A202C' : '#e5e5e5'),
                borderRadius: '4px',
                background: p.slug === selectedSlug ? '#f7f7f7' : '#ffffff',
                fontFamily: 'Jost, sans-serif',
                fontSize: '13px',
                color: '#1A202C',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <span>{p.title}</span>
              {/* Small pill: has this page been edited, or is it the default? */}
              <span
                style={{
                  fontSize: '10px',
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                  padding: '2px 8px',
                  borderRadius: '999px',
                  background: p.edited ? '#1A202C' : '#f2f2f2',
                  color: p.edited ? '#ffffff' : '#6f6f6f',
                }}
              >
                {p.edited ? 'edited' : 'default'}
              </span>
            </button>
          ))}
        </div>

        {/* RIGHT: the editor for the selected page */}
        {selectedSlug && (
          <div style={{ flex: 1, minWidth: '320px', maxWidth: '720px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#6f6f6f', marginBottom: '6px' }}>
              Page title
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              style={{ ...inputStyle, marginBottom: '16px' }}
            />

            <label style={{ display: 'block', fontSize: '12px', color: '#6f6f6f', marginBottom: '6px' }}>
              Page text — blank line = new paragraph
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={18}
              style={{ ...inputStyle, lineHeight: 1.7, resize: 'vertical', marginBottom: '16px' }}
            />

            {/* Success / error banner */}
            {message && (
              <p
                style={{
                  fontSize: '13px',
                  padding: '10px 12px',
                  borderRadius: '4px',
                  marginBottom: '16px',
                  background: message.kind === 'ok' ? '#ecf7ee' : '#fdecec',
                  color: message.kind === 'ok' ? '#1f6b31' : '#a12626',
                }}
              >
                {message.text}
              </p>
            )}

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  padding: '10px 28px',
                  background: '#1A202C',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '4px',
                  fontFamily: 'Jost, sans-serif',
                  fontSize: '13px',
                  letterSpacing: '1px',
                  textTransform: 'uppercase',
                  cursor: saving ? 'wait' : 'pointer',
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? 'Saving…' : 'Save'}
              </button>

              <button
                onClick={handleRestore}
                disabled={saving}
                style={{
                  padding: '10px 20px',
                  background: '#ffffff',
                  color: '#1A202C',
                  border: '1px solid #e5e5e5',
                  borderRadius: '4px',
                  fontFamily: 'Jost, sans-serif',
                  fontSize: '13px',
                  cursor: saving ? 'wait' : 'pointer',
                }}
              >
                Restore original text
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
