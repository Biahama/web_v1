'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const EMPTY = { fullName: '', phone: '', line1: '', line2: '', area: '', pincode: '', city: '', district: '', state: '', isDefault: false }
const FIELDS = [
  ['fullName', 'Full name', 'name', true], ['phone', 'Mobile number', 'tel-national', true],
  ['line1', 'House number & street', 'address-line1', true], ['line2', 'Apartment, floor (optional)', 'address-line2'],
  ['area', 'Area / locality (optional)', 'off'], ['pincode', 'PIN code', 'postal-code', true],
  ['city', 'City', 'address-level2', true], ['district', 'District (optional)', 'off'], ['state', 'State / union territory', 'address-level1', true],
]

export default function AddressBook({ addresses = [], unavailable = false }) {
  const router = useRouter()
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [removing, setRemoving] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  function edit(address) {
    setForm({ ...EMPTY, ...Object.fromEntries(Object.keys(EMPTY).map(key => [key, address?.[key] ?? EMPTY[key]])) })
    setEditing(address?.id || 'new'); setRemoving(null); setError(''); setNotice('')
  }
  async function mutate(url, method, data, message) {
    setBusy(true); setError(''); setNotice('')
    try {
      const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, ...(data ? { body: JSON.stringify(data) } : {}) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Unable to save your address.')
      setEditing(null); setRemoving(null); setNotice(message); router.refresh()
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  return (
    <section id="addresses" className="account-section">
      <div className="section-header"><div><p className="eyebrow">For your next visit</p><h2>Address book</h2></div><button className="text-action" disabled={busy || unavailable} onClick={() => edit(null)}>Add an address +</button></div>
      <p className="muted section-description">Your default address is selected at checkout. Changes here won’t change orders already placed.</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      {notice && <p className="form-success" role="status">{notice}</p>}
      {editing ? (
        <form className="account-form" onSubmit={e => { e.preventDefault(); mutate(editing === 'new' ? '/api/addresses' : '/api/addresses/' + editing, editing === 'new' ? 'POST' : 'PATCH', form, 'Address saved.') }}>
          <h3>{editing === 'new' ? 'A new address' : 'Edit your address'}</h3>
          <div className="form-grid">{FIELDS.map(([key, label, autoComplete, required]) => <label key={key} className={key === 'line1' || key === 'line2' ? 'form-wide' : ''}>{label}<input autoFocus={key === 'fullName'} name={key} autoComplete={autoComplete} required={required} maxLength={key === 'pincode' ? 6 : key === 'phone' ? 10 : 200} inputMode={key === 'phone' || key === 'pincode' ? 'numeric' : 'text'} pattern={key === 'phone' ? '[6-9][0-9]{9}' : key === 'pincode' ? '[1-9][0-9]{5}' : undefined} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} disabled={busy} /></label>)}</div>
          <p className="muted">Country: India</p>
          <label className="checkbox-label"><input type="checkbox" checked={form.isDefault} onChange={e => setForm({ ...form, isDefault: e.target.checked })} disabled={busy || addresses.find(a => a.id === editing)?.isDefault} />Use as my default address</label>
          <div className="button-row"><button className="primary-action" disabled={busy}>{busy ? 'Saving…' : 'Save address'}</button><button className="text-action" type="button" disabled={busy} onClick={() => { setEditing(null); setError('') }}>Cancel</button></div>
        </form>
      ) : unavailable ? <p className="muted">Your addresses are temporarily unavailable. Please refresh in a moment.</p> : addresses.length === 0 ? <div className="quiet-empty">A little less to fill in next time.<p>Add your first delivery address for an easier checkout.</p></div> : (
        <div className="address-grid">{addresses.map(a => <article className="address-card" key={a.id}>
          <div className="address-heading"><h3>{a.fullName}</h3>{a.isDefault && <span className="subtle-badge">Default</span>}</div>
          <p>{a.line1}{a.line2 && <><br />{a.line2}</>}{a.area && <><br />{a.area}</>}<br />{a.city}, {a.state} {a.pincode}<br />India</p><p className="muted">+91 {a.phone}</p>
          {removing === a.id ? <div className="delete-confirm"><p>Remove this saved address?</p><div className="button-row"><button className="text-action danger" disabled={busy} onClick={() => mutate('/api/addresses/' + a.id, 'DELETE', null, 'Address removed.')}>{busy ? 'Removing…' : 'Yes, remove'}</button><button className="text-action" disabled={busy} onClick={() => setRemoving(null)}>Keep address</button></div></div> : <div className="address-actions"><button className="text-action" disabled={busy} onClick={() => edit(a)}>Edit</button>{!a.isDefault && <button className="text-action" disabled={busy} onClick={() => mutate('/api/addresses/' + a.id, 'PATCH', { isDefault: true }, 'Default address updated.')}>Make default</button>}<button className="text-action" disabled={busy} onClick={() => { setRemoving(a.id); setError(''); setNotice('') }}>Remove</button></div>}
        </article>)}</div>
      )}
    </section>
  )
}
