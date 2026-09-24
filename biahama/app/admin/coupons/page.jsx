'use client'

// ============================================================
// ADMIN: COUPONS — create and manage discount codes
// ============================================================
// The table shows every coupon and how much it has been used.
// "+ New coupon" opens a form; "Edit" opens the same form with
// that coupon's values filled in.
//
// Money note: the database stores amounts in PAISE (₹500 =
// 50000). This form shows RUPEES and converts automatically.
// A "percent" coupon's value is just the percent number.
// ============================================================

import { useState, useEffect } from 'react'

// ---------- small shared styles (same look as the products admin) ----------
const inputStyle = {
  width: '100%', padding: '8px 10px', border: '1px solid #cbd5e0',
  borderRadius: 4, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box',
}
const labelStyle = { display: 'block', fontSize: 13, color: '#4a5568', marginBottom: 4 }
const helpStyle  = { fontSize: 12, color: '#718096', margin: '4px 0 0 0' }
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

// Paise -> "₹500" for the table.
function rupees(paise) {
  return `₹${(paise / 100).toLocaleString('en-IN')}`
}

// "2026-07-31T..." -> "2026-07-31" for <input type="date">.
function toDateInput(iso) {
  return iso ? String(iso).slice(0, 10) : ''
}

// "2026-07-31T..." -> "31 Jul 2026" for the table.
function prettyDate(iso) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

// An empty form (dates default to "today" and "today + 30 days").
function blankForm() {
  const today = new Date()
  const inAMonth = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
  return {
    id: null, // null = creating a new coupon
    code: '',
    type: 'percent',
    value: '',          // percent number OR rupees, depending on type
    minOrderRupees: '', // optional
    maxDiscountRupees: '', // optional, only matters for percent
    usageLimit: '',     // optional
    validFrom: today.toISOString().slice(0, 10),
    validUntil: inAMonth.toISOString().slice(0, 10),
    isActive: true,
  }
}

// A database coupon -> form values (paise back to rupees).
function couponToForm(c) {
  return {
    id: c.id,
    code: c.code,
    type: c.type,
    value: c.type === 'flat' ? String(c.value / 100) : String(c.value),
    minOrderRupees: c.minOrderValue != null ? String(c.minOrderValue / 100) : '',
    maxDiscountRupees: c.maxDiscount != null ? String(c.maxDiscount / 100) : '',
    usageLimit: c.usageLimit != null ? String(c.usageLimit) : '',
    validFrom: toDateInput(c.validFrom),
    validUntil: toDateInput(c.validUntil),
    isActive: c.isActive,
  }
}

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm]       = useState(null) // null = form closed
  const [saving, setSaving]   = useState(false)
  const [banner, setBanner]   = useState(null) // { kind: 'ok'|'error', text }

  function showError(text) { setBanner({ kind: 'error', text }) }
  function showOk(text)    { setBanner({ kind: 'ok', text }) }

  // Load the coupon list.
  async function loadCoupons() {
    try {
      const res  = await fetch('/api/admin/coupons')
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        showError(data.error || 'Could not load coupons.')
        return
      }
      setCoupons(data.coupons)
    } catch (err) {
      showError(`Could not reach the server: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { loadCoupons() }, [])

  function setField(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  // Turn the form (rupees, text) into what the API expects
  // (paise, numbers). Returns null and shows an error if invalid.
  function buildPayload() {
    if (!form.code || form.code.trim().length < 3) {
      showError('The code must be at least 3 characters (e.g. WELCOME10).')
      return null
    }

    let value
    if (form.type === 'percent') {
      value = parseInt(form.value, 10)
      if (!Number.isFinite(value) || value <= 0 || value > 100) {
        showError('For a percent coupon, enter a whole number between 1 and 100.')
        return null
      }
    } else {
      // flat: rupees typed by the admin -> paise for the database
      value = Math.round(parseFloat(form.value) * 100)
      if (!Number.isFinite(value) || value <= 0) {
        showError('For a flat coupon, enter the rupee amount to take off (e.g. 200).')
        return null
      }
    }

    let minOrderValue = null
    if (form.minOrderRupees !== '') {
      minOrderValue = Math.round(parseFloat(form.minOrderRupees) * 100)
      if (!Number.isFinite(minOrderValue) || minOrderValue <= 0) {
        showError('Minimum order must be a rupee amount greater than 0, or left empty.')
        return null
      }
    }

    let maxDiscount = null
    if (form.maxDiscountRupees !== '') {
      maxDiscount = Math.round(parseFloat(form.maxDiscountRupees) * 100)
      if (!Number.isFinite(maxDiscount) || maxDiscount <= 0) {
        showError('Maximum discount must be a rupee amount greater than 0, or left empty.')
        return null
      }
    }

    let usageLimit = null
    if (form.usageLimit !== '') {
      usageLimit = parseInt(form.usageLimit, 10)
      if (!Number.isFinite(usageLimit) || usageLimit <= 0) {
        showError('Usage limit must be a whole number greater than 0, or left empty.')
        return null
      }
    }

    if (!form.validFrom || !form.validUntil) {
      showError('Please pick both a start and an end date.')
      return null
    }

    return {
      code: form.code.trim().toUpperCase(),
      type: form.type,
      value,
      minOrderValue,
      maxDiscount,
      usageLimit,
      validFrom: form.validFrom,
      validUntil: form.validUntil,
      isActive: form.isActive,
    }
  }

  // Save (create or update, depending on form.id).
  async function handleSave() {
    setBanner(null)
    const payload = buildPayload()
    if (!payload) return

    setSaving(true)
    try {
      const url    = form.id ? `/api/admin/coupons/${form.id}` : '/api/admin/coupons'
      const method = form.id ? 'PATCH' : 'POST'
      const res  = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        showError(data.error || 'Could not save — please try again.')
        return
      }
      showOk(form.id ? 'Coupon updated.' : `Coupon ${data.coupon.code} created.`)
      setForm(null)
      await loadCoupons()
    } catch (err) {
      showError(`Could not reach the server: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  // Turn a coupon on or off with one click.
  async function handleToggleActive(coupon) {
    setBanner(null)
    try {
      const res  = await fetch(`/api/admin/coupons/${coupon.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !coupon.isActive }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        showError(data.error || 'Could not change the coupon.')
        return
      }
      showOk(coupon.isActive
        ? `${coupon.code} is now OFF — customers can no longer use it.`
        : `${coupon.code} is now ON.`)
      await loadCoupons()
    } catch (err) {
      showError(`Could not reach the server: ${err.message}`)
    }
  }

  // Delete — the server refuses if any order used the code, and
  // deactivates it instead (its message explains that).
  async function handleDelete(coupon) {
    if (!confirm(`Delete coupon ${coupon.code}? If it was never used on an order it will be removed completely.`)) return
    setBanner(null)
    try {
      const res  = await fetch(`/api/admin/coupons/${coupon.id}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        showError(data.error || 'Could not delete.')
        return
      }
      showOk(data.message)
      await loadCoupons()
    } catch (err) {
      showError(`Could not reach the server: ${err.message}`)
    }
  }

  // "10% off, max ₹500" / "₹200 off" — a human sentence per coupon.
  function describeDiscount(c) {
    if (c.type === 'percent') {
      return c.maxDiscount ? `${c.value}% off, max ${rupees(c.maxDiscount)}` : `${c.value}% off`
    }
    return `${rupees(c.value)} off`
  }

  return (
    <div style={{ fontFamily: "var(--font-jost), 'Jost', sans-serif", color: '#1A202C', maxWidth: 1000 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: 24, fontWeight: 500, marginTop: 0 }}>Coupons</h1>
        {!form && (
          <button style={darkButton} onClick={() => { setBanner(null); setForm(blankForm()) }}>
            + New coupon
          </button>
        )}
      </div>

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

      {/* ---------------- THE FORM (create or edit) ---------------- */}
      {form && (
        <div style={sectionStyle}>
          <h2 style={{ fontSize: 16, fontWeight: 500, margin: '0 0 16px 0' }}>
            {form.id ? `Edit coupon: ${form.code}` : 'New coupon'}
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Code *</label>
              <input
                style={{ ...inputStyle, textTransform: 'uppercase' }}
                value={form.code}
                onChange={(e) => setField('code', e.target.value)}
                placeholder="e.g. WELCOME10"
              />
              <p style={helpStyle}>What the customer types in the cart. Saved in CAPITALS automatically.</p>
            </div>
            <div>
              <label style={labelStyle}>Discount type *</label>
              <select style={inputStyle} value={form.type} onChange={(e) => setField('type', e.target.value)}>
                <option value="percent">Percent off (e.g. 10% off the cart)</option>
                <option value="flat">Fixed amount off (e.g. ₹200 off)</option>
              </select>
              <p style={helpStyle}>Percent grows with the cart; a fixed amount is always the same.</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>
                {form.type === 'percent' ? 'Percent off (1–100) *' : 'Amount off in rupees *'}
              </label>
              <input
                type="number" min="1" style={inputStyle}
                value={form.value}
                onChange={(e) => setField('value', e.target.value)}
                placeholder={form.type === 'percent' ? 'e.g. 10' : 'e.g. 200'}
              />
              <p style={helpStyle}>
                {form.type === 'percent'
                  ? 'Example: 10 means the cart gets 10% cheaper.'
                  : 'Example: 200 takes ₹200 off the cart.'}
              </p>
            </div>
            <div>
              <label style={labelStyle}>Maximum discount in rupees (optional)</label>
              <input
                type="number" min="1" style={inputStyle}
                value={form.maxDiscountRupees}
                onChange={(e) => setField('maxDiscountRupees', e.target.value)}
                placeholder="e.g. 500"
                disabled={form.type === 'flat'}
              />
              <p style={helpStyle}>
                {form.type === 'flat'
                  ? 'Not needed for fixed-amount coupons.'
                  : 'Caps a percent coupon. Example: 10% off but never more than ₹500.'}
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Minimum order in rupees (optional)</label>
              <input
                type="number" min="1" style={inputStyle}
                value={form.minOrderRupees}
                onChange={(e) => setField('minOrderRupees', e.target.value)}
                placeholder="e.g. 2000"
              />
              <p style={helpStyle}>The cart must be at least this much before the coupon works. Leave empty for no minimum.</p>
            </div>
            <div>
              <label style={labelStyle}>Usage limit (optional)</label>
              <input
                type="number" min="1" step="1" style={inputStyle}
                value={form.usageLimit}
                onChange={(e) => setField('usageLimit', e.target.value)}
                placeholder="e.g. 100"
              />
              <p style={helpStyle}>How many orders may use this coupon in total. Leave empty for unlimited.</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Valid from *</label>
              <input
                type="date" style={inputStyle}
                value={form.validFrom}
                onChange={(e) => setField('validFrom', e.target.value)}
              />
              <p style={helpStyle}>The first day the coupon works.</p>
            </div>
            <div>
              <label style={labelStyle}>Valid until *</label>
              <input
                type="date" style={inputStyle}
                value={form.validUntil}
                onChange={(e) => setField('validUntil', e.target.value)}
              />
              <p style={helpStyle}>The last day it works (the whole day counts).</p>
            </div>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer', marginBottom: 16 }}>
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setField('isActive', e.target.checked)}
            />
            Active (customers can use it right away)
          </label>

          <div style={{ display: 'flex', gap: 12 }}>
            <button style={{ ...darkButton, opacity: saving ? 0.6 : 1 }} disabled={saving} onClick={handleSave}>
              {saving ? 'Saving…' : form.id ? 'Save changes' : 'Create coupon'}
            </button>
            <button style={lightButton} onClick={() => setForm(null)}>Cancel</button>
          </div>
        </div>
      )}

      {/* ---------------- THE TABLE ---------------- */}
      {loading ? (
        <p style={{ fontSize: 14, color: '#4a5568' }}>Loading coupons…</p>
      ) : coupons.length === 0 ? (
        <p style={{ fontSize: 14, color: '#4a5568' }}>
          No coupons yet. Click &quot;+ New coupon&quot; to create your first discount code.
        </p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '2px solid #e2e8f0', color: '#4a5568', fontSize: 13 }}>
              <th style={{ padding: 8 }}>Code</th>
              <th style={{ padding: 8 }}>Discount</th>
              <th style={{ padding: 8 }}>Min order</th>
              <th style={{ padding: 8 }}>Used</th>
              <th style={{ padding: 8 }}>Validity</th>
              <th style={{ padding: 8 }}>Status</th>
              <th style={{ padding: 8 }}></th>
            </tr>
          </thead>
          <tbody>
            {coupons.map((c) => (
              <tr key={c.id} style={{ borderBottom: '1px solid #edf2f7' }}>
                <td style={{ padding: 8, fontWeight: 500 }}>{c.code}</td>
                <td style={{ padding: 8 }}>{describeDiscount(c)}</td>
                <td style={{ padding: 8 }}>{c.minOrderValue ? rupees(c.minOrderValue) : '—'}</td>
                <td style={{ padding: 8 }}>
                  {c.usageLimit ? `${c.usedCount} of ${c.usageLimit}` : `${c.usedCount}`}
                </td>
                <td style={{ padding: 8, whiteSpace: 'nowrap' }}>
                  {prettyDate(c.validFrom)} – {prettyDate(c.validUntil)}
                </td>
                <td style={{ padding: 8 }}>
                  {/* Green pill = live, gray pill = off */}
                  <span style={{
                    display: 'inline-block', padding: '2px 10px', borderRadius: 999, fontSize: 12,
                    background: c.isActive ? '#c6f6d5' : '#e2e8f0',
                    color:      c.isActive ? '#22543d' : '#4a5568',
                  }}>
                    {c.isActive ? 'Active' : 'Off'}
                  </span>
                </td>
                <td style={{ padding: 8, whiteSpace: 'nowrap' }}>
                  <button
                    style={{ ...lightButton, marginRight: 8 }}
                    onClick={() => { setBanner(null); setForm(couponToForm(c)) }}
                  >
                    Edit
                  </button>
                  <button
                    style={{ ...lightButton, marginRight: 8 }}
                    onClick={() => handleToggleActive(c)}
                  >
                    {c.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    style={{ ...lightButton, color: '#c53030', borderColor: '#feb2b2' }}
                    onClick={() => handleDelete(c)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
