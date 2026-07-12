'use client'

// ============================================================
// The product form — used for BOTH "new product" and "edit".
// ============================================================
// If `initial` is null we are creating a new product.
// If `initial` is a product from the database we are editing it.
//
// Money note: the shop's database stores prices in PAISE
// (₹2,450 = 245000) so there are never rounding errors. This
// form shows RUPEES to you and converts automatically.
// ============================================================

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

// ---------- small shared styles (kept simple on purpose) ----------
const inputStyle = {
  width: '100%', padding: '8px 10px', border: '1px solid #cbd5e0',
  borderRadius: 4, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box',
}
const labelStyle = { display: 'block', fontSize: 13, color: '#4a5568', marginBottom: 4 }
const darkButton = {
  background: '#1A202C', color: '#fff', border: 'none', padding: '10px 18px',
  borderRadius: 4, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
}
const lightButton = {
  background: '#fff', color: '#1A202C', border: '1px solid #cbd5e0', padding: '6px 12px',
  borderRadius: 4, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
}
const sectionStyle = {
  border: '1px solid #e2e8f0', borderRadius: 8, padding: 20, marginBottom: 20,
}
const sectionTitle = { fontSize: 16, fontWeight: 500, margin: '0 0 16px 0' }

// A brand-new, empty size row for the table.
function blankVariant() {
  return {
    id: null, size: '', color: '', colorHex: '#cccccc',
    priceRupees: '', compareRupees: '', stockQty: '0', sku: '',
  }
}

// Convert a database variant (paise) to a form row (rupees).
function variantToRow(v) {
  return {
    id: v.id,
    size: v.size,
    color: v.color,
    colorHex: v.colorHex || '#cccccc',
    priceRupees: String(v.price / 100),
    compareRupees: v.comparePrice != null ? String(v.comparePrice / 100) : '',
    stockQty: String(v.stockQty),
    sku: v.sku || '',
  }
}

export default function ProductForm({ initial = null }) {
  const router = useRouter()
  const isEdit = initial !== null
  const fileInputRef = useRef(null)

  // ---------- form state ----------
  const [name, setName]               = useState(initial?.name || '')
  const [category, setCategory]       = useState(initial?.category || '')
  const [description, setDescription] = useState(initial?.description || '')
  const [fabric, setFabric]           = useState(initial?.fabric || '')
  const [care, setCare]               = useState(initial?.care || '')
  const [isActive, setIsActive]       = useState(initial ? initial.isActive : true)

  const [variants, setVariants] = useState(
    initial?.variants?.length ? initial.variants.map(variantToRow) : [blankVariant()]
  )
  const [images, setImages] = useState(initial?.images || [])

  // ---------- status state (banners, spinners) ----------
  const [banner, setBanner]       = useState(null) // { kind: 'ok'|'error', text }
  const [saving, setSaving]       = useState(false)
  const [uploading, setUploading] = useState(false)
  const [photoBusy, setPhotoBusy] = useState(false)

  function showError(text) { setBanner({ kind: 'error', text }) }
  function showOk(text)    { setBanner({ kind: 'ok', text }) }

  // ---------- size rows ----------
  function updateVariant(index, field, value) {
    setVariants((rows) => rows.map((r, i) => (i === index ? { ...r, [field]: value } : r)))
  }

  function addVariant() {
    setVariants((rows) => {
      const prev = rows[rows.length - 1]
      const row = blankVariant()
      // Convenience: a new size usually shares the previous row's
      // color and price, so copy them across.
      if (prev) {
        row.color = prev.color
        row.colorHex = prev.colorHex
        row.priceRupees = prev.priceRupees
        row.compareRupees = prev.compareRupees
      }
      return [...rows, row]
    })
  }

  function removeVariant(index) {
    if (variants.length === 1) {
      showError('A product needs at least one size row.')
      return
    }
    setVariants((rows) => rows.filter((_, i) => i !== index))
  }

  // Turn the form's size rows into what the API expects
  // (rupees -> paise, numbers instead of text). Returns null and
  // shows an error if something is not a valid number.
  function buildVariantsPayload() {
    const payload = []
    for (let i = 0; i < variants.length; i++) {
      const r = variants[i]
      const price = Math.round(parseFloat(r.priceRupees) * 100)
      if (!Number.isFinite(price) || price <= 0) {
        showError(`Size row ${i + 1}: the price must be a number greater than 0 (in rupees).`)
        return null
      }
      let comparePrice = null
      if (r.compareRupees !== '' && r.compareRupees != null) {
        comparePrice = Math.round(parseFloat(r.compareRupees) * 100)
        if (!Number.isFinite(comparePrice) || comparePrice <= 0) {
          showError(`Size row ${i + 1}: the compare-at price must be a number greater than 0, or left empty.`)
          return null
        }
      }
      const stockQty = parseInt(r.stockQty, 10)
      if (!Number.isFinite(stockQty) || stockQty < 0) {
        showError(`Size row ${i + 1}: stock must be 0 or more.`)
        return null
      }
      payload.push({
        ...(r.id ? { id: r.id } : {}), // id present = update this existing row
        size: r.size,
        color: r.color,
        colorHex: r.colorHex || null,
        price,        // paise
        comparePrice, // paise or null
        stockQty,
        sku: r.sku || null, // blank = the server invents one
      })
    }
    return payload
  }

  // ---------- save (create or update) ----------
  async function handleSave() {
    setBanner(null)
    const variantsPayload = buildVariantsPayload()
    if (!variantsPayload) return

    const body = {
      name, category, description, fabric, care, isActive,
      variants: variantsPayload,
    }

    setSaving(true)
    try {
      const url    = isEdit ? `/api/admin/products/${initial.id}` : '/api/admin/products'
      const method = isEdit ? 'PATCH' : 'POST'
      const res  = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        showError(data.error || 'Could not save — please try again.')
        return
      }

      if (isEdit) {
        // Refresh the size rows so brand-new rows get their id + SKU.
        if (data.product?.variants) setVariants(data.product.variants.map(variantToRow))
        showOk(data.message || 'Saved.')
        router.refresh()
      } else {
        // New product created — jump to its edit page so photos
        // can be added right away.
        router.push(`/admin/products/${data.product.id}`)
        router.refresh()
      }
    } catch (err) {
      showError(`Could not reach the server: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  // ---------- show / hide in shop ----------
  async function handleToggleActive() {
    setBanner(null)
    try {
      const res  = await fetch(`/api/admin/products/${initial.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        showError(data.error || 'Could not change visibility.')
        return
      }
      setIsActive(!isActive)
      showOk(!isActive ? 'Product is now VISIBLE in the shop.' : 'Product is now HIDDEN from the shop.')
      router.refresh()
    } catch (err) {
      showError(`Could not reach the server: ${err.message}`)
    }
  }

  // ---------- delete ----------
  async function handleDelete() {
    // Two confirmations on purpose — deleting is a big deal.
    if (!confirm(`Delete "${name}"? If it was never ordered it will be removed completely.`)) return
    if (!confirm('Are you REALLY sure? This cannot be undone.')) return

    setBanner(null)
    try {
      const res  = await fetch(`/api/admin/products/${initial.id}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        showError(data.error || 'Could not delete.')
        return
      }
      if (data.archived) {
        // It had orders, so the server hid it instead of deleting.
        setIsActive(false)
        showOk(data.message)
      } else {
        alert(data.message || 'Product deleted.')
        router.push('/admin/products')
        router.refresh()
      }
    } catch (err) {
      showError(`Could not reach the server: ${err.message}`)
    }
  }

  // ---------- photos ----------
  // Reload the photo list from the server after any change.
  async function reloadImages() {
    const res  = await fetch(`/api/admin/products/${initial.id}`)
    const data = await res.json().catch(() => ({}))
    if (res.ok && data.product) setImages(data.product.images)
  }

  async function handleUpload(event) {
    const file = event.target.files?.[0]
    if (!file) return
    setBanner(null)
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('productId', initial.id)
      const res  = await fetch('/api/admin/upload', { method: 'POST', body: form })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        showError(data.error || 'Upload failed — please try again.')
        return
      }
      await reloadImages()
      showOk('Photo uploaded.')
    } catch (err) {
      showError(`Upload failed: ${err.message}`)
    } finally {
      setUploading(false)
      // Clear the picker so choosing the same file again re-triggers.
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function photoAction(imageId, action) {
    setBanner(null)
    setPhotoBusy(true)
    try {
      const res  = await fetch('/api/admin/upload', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageId, action }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        showError(data.error || 'Could not update the photo.')
        return
      }
      if (data.images) setImages(data.images)
      else await reloadImages()
    } catch (err) {
      showError(`Could not update the photo: ${err.message}`)
    } finally {
      setPhotoBusy(false)
    }
  }

  async function deletePhoto(imageId) {
    if (!confirm('Remove this photo?')) return
    setBanner(null)
    setPhotoBusy(true)
    try {
      const res  = await fetch(`/api/admin/upload?imageId=${encodeURIComponent(imageId)}`, {
        method: 'DELETE',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        showError(data.error || 'Could not remove the photo.')
        return
      }
      await reloadImages()
    } catch (err) {
      showError(`Could not remove the photo: ${err.message}`)
    } finally {
      setPhotoBusy(false)
    }
  }

  // ============================================================
  // The form itself
  // ============================================================
  return (
    <div style={{ fontFamily: "var(--font-jost), 'Jost', sans-serif", color: '#1A202C', maxWidth: 900 }}>
      <h1 style={{ fontSize: 24, fontWeight: 500, marginTop: 0 }}>
        {isEdit ? `Edit: ${initial.name}` : 'New product'}
      </h1>

      {/* Success / error banner — always tells you what happened */}
      {banner && (
        <div
          style={{
            padding: '10px 14px', borderRadius: 4, marginBottom: 16, fontSize: 14,
            background: banner.kind === 'ok' ? '#c6f6d5' : '#fed7d7',
            color:      banner.kind === 'ok' ? '#22543d' : '#742a2a',
          }}
        >
          {banner.text}
        </div>
      )}

      {/* ---------------- BASICS ---------------- */}
      <div style={sectionStyle}>
        <h2 style={sectionTitle}>Basics</h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 12 }}>
          <div>
            <label style={labelStyle}>Name *</label>
            <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sage Volume Trouser" />
          </div>
          <div>
            <label style={labelStyle}>Category *</label>
            {/* Type anything, or pick one of the suggestions */}
            <input style={inputStyle} value={category} onChange={(e) => setCategory(e.target.value)} list="category-suggestions" placeholder="e.g. trousers" />
            <datalist id="category-suggestions">
              <option value="Kurta" />
              <option value="shirts" />
              <option value="tunics" />
              <option value="trousers" />
            </datalist>
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Description</label>
          <textarea
            style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What makes this piece special? Shown on the product page."
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 12 }}>
          <div>
            <label style={labelStyle}>Fabric</label>
            <input style={inputStyle} value={fabric} onChange={(e) => setFabric(e.target.value)} placeholder="e.g. 100% Premium Organic Indian Linen" />
          </div>
          <div>
            <label style={labelStyle}>Care instructions</label>
            <input style={inputStyle} value={care} onChange={(e) => setCare(e.target.value)} placeholder="e.g. Hand wash cold. Dry flat in shade." />
          </div>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer' }}>
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          Active (visible in the shop)
        </label>
      </div>

      {/* ---------------- PHOTOS ---------------- */}
      <div style={sectionStyle}>
        <h2 style={sectionTitle}>Photos</h2>

        {!isEdit ? (
          // Photos need a product id to attach to, which only exists
          // after the first save.
          <p style={{ fontSize: 14, color: '#4a5568', margin: 0 }}>
            Save the product first, then add photos.
          </p>
        ) : (
          <>
            {images.length === 0 && (
              <p style={{ fontSize: 14, color: '#4a5568' }}>
                No photos yet. The first photo you add becomes the main one shown in the shop.
              </p>
            )}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 16 }}>
              {images.map((img) => (
                <div key={img.id} style={{ width: 130, border: '1px solid #e2e8f0', borderRadius: 8, padding: 8 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.url}
                    alt={img.altText || 'Product photo'}
                    style={{ width: '100%', height: 150, objectFit: 'cover', borderRadius: 4 }}
                  />
                  {img.isPrimary ? (
                    <div style={{ fontSize: 12, color: '#22543d', margin: '6px 0', textAlign: 'center' }}>
                      ★ Main photo
                    </div>
                  ) : (
                    <button
                      style={{ ...lightButton, width: '100%', margin: '6px 0' }}
                      disabled={photoBusy}
                      onClick={() => photoAction(img.id, 'makePrimary')}
                    >
                      Make main
                    </button>
                  )}
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button style={{ ...lightButton, flex: 1 }} title="Move earlier" disabled={photoBusy} onClick={() => photoAction(img.id, 'moveUp')}>←</button>
                    <button style={{ ...lightButton, flex: 1 }} title="Move later" disabled={photoBusy} onClick={() => photoAction(img.id, 'moveDown')}>→</button>
                    <button
                      style={{ ...lightButton, flex: 1, color: '#c53030', borderColor: '#feb2b2' }}
                      title="Remove photo"
                      disabled={photoBusy}
                      onClick={() => deletePhoto(img.id)}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* The uploader */}
            <label style={{ fontSize: 14 }}>
              <span style={{ ...lightButton, display: 'inline-block' }}>
                {uploading ? 'Uploading…' : '+ Add photo'}
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleUpload}
                disabled={uploading}
                style={{ display: 'none' }}
              />
            </label>
            <span style={{ fontSize: 12, color: '#4a5568', marginLeft: 10 }}>
              JPG, PNG or WebP, under 10 MB.
            </span>
          </>
        )}
      </div>

      {/* ---------------- SIZES & STOCK ---------------- */}
      <div style={sectionStyle}>
        <h2 style={sectionTitle}>Sizes &amp; stock</h2>
        <p style={{ fontSize: 13, color: '#4a5568', marginTop: 0 }}>
          One row per size. Prices are in rupees. Leave SKU blank and one is created automatically.
        </p>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '2px solid #e2e8f0', color: '#4a5568', fontSize: 13 }}>
              <th style={{ padding: 6 }}>Size *</th>
              <th style={{ padding: 6 }}>Color *</th>
              <th style={{ padding: 6 }}>Swatch</th>
              <th style={{ padding: 6 }}>Price (₹) *</th>
              <th style={{ padding: 6 }}>Was-price (₹)</th>
              <th style={{ padding: 6 }}>Stock *</th>
              <th style={{ padding: 6 }}></th>
            </tr>
          </thead>
          <tbody>
            {variants.map((row, i) => (
              // Existing rows are identified by their database id;
              // new rows by their position in the list.
              <tr key={row.id || `new-${i}`} style={{ borderBottom: '1px solid #edf2f7' }}>
                <td style={{ padding: 6 }}>
                  <input style={{ ...inputStyle, width: 70 }} value={row.size} onChange={(e) => updateVariant(i, 'size', e.target.value)} placeholder="M" />
                </td>
                <td style={{ padding: 6 }}>
                  <input style={{ ...inputStyle, width: 120 }} value={row.color} onChange={(e) => updateVariant(i, 'color', e.target.value)} placeholder="Sage" />
                </td>
                <td style={{ padding: 6 }}>
                  {/* The little color square shown on the shop page */}
                  <input
                    type="color"
                    value={row.colorHex}
                    onChange={(e) => updateVariant(i, 'colorHex', e.target.value)}
                    style={{ width: 36, height: 32, padding: 0, border: '1px solid #cbd5e0', borderRadius: 4, cursor: 'pointer' }}
                  />
                </td>
                <td style={{ padding: 6 }}>
                  <input type="number" min="1" step="any" style={{ ...inputStyle, width: 90 }} value={row.priceRupees} onChange={(e) => updateVariant(i, 'priceRupees', e.target.value)} placeholder="2450" />
                </td>
                <td style={{ padding: 6 }}>
                  {/* Optional strike-through "was ₹X" price */}
                  <input type="number" min="1" step="any" style={{ ...inputStyle, width: 90 }} value={row.compareRupees} onChange={(e) => updateVariant(i, 'compareRupees', e.target.value)} placeholder="—" />
                </td>
                <td style={{ padding: 6 }}>
                  <input type="number" min="0" step="1" style={{ ...inputStyle, width: 70 }} value={row.stockQty} onChange={(e) => updateVariant(i, 'stockQty', e.target.value)} />
                </td>
                <td style={{ padding: 6 }}>
                  <button style={{ ...lightButton, color: '#c53030', borderColor: '#feb2b2' }} title="Remove this size row" onClick={() => removeVariant(i)}>
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <button style={{ ...lightButton, marginTop: 12 }} onClick={addVariant}>
          + Add size
        </button>
        {isEdit && (
          <p style={{ fontSize: 12, color: '#4a5568', marginBottom: 0 }}>
            Removing a size that customers have already bought sets its stock to 0
            instead of deleting it, so old orders keep their history.
          </p>
        )}
      </div>

      {/* ---------------- ACTION BUTTONS ---------------- */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 40 }}>
        <button style={{ ...darkButton, opacity: saving ? 0.6 : 1 }} disabled={saving} onClick={handleSave}>
          {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create product'}
        </button>

        {isEdit && (
          <>
            {/* Prefer hiding over deleting — it is always reversible */}
            <button style={lightButton} onClick={handleToggleActive}>
              {isActive ? 'Hide from shop' : 'Show in shop'}
            </button>
            <button
              style={{ ...lightButton, color: '#c53030', borderColor: '#feb2b2', marginLeft: 'auto' }}
              onClick={handleDelete}
            >
              Delete product
            </button>
          </>
        )}
      </div>
    </div>
  )
}
