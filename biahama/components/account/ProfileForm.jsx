'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ProfileForm({ name = '', phone = '', email, unavailable = false }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [values, setValues] = useState({ name, phone })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  async function save(event) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('')
    try {
      const response = await fetch('/api/account', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to save your details.')
      setEditing(false); setNotice('Your details have been saved.'); router.refresh()
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  return <section id="details" className="account-section"><div className="section-header"><div><p className="eyebrow">The personal details</p><h2>My profile</h2></div><button className="text-action" disabled={busy || unavailable} onClick={() => { setEditing(!editing); setValues({ name, phone }); setError(''); setNotice('') }}>{editing ? 'Cancel' : 'Edit details'}</button></div>
    {notice && <p className="form-success" role="status">{notice}</p>}{error && <p className="form-error" role="alert">{error}</p>}
    {editing ? <form className="account-form" onSubmit={save}><div className="form-grid"><label>Full name<input autoFocus required autoComplete="name" minLength={2} maxLength={100} value={values.name} disabled={busy} onChange={e => setValues({ ...values, name: e.target.value })} /></label><label>Contact mobile (optional)<input autoComplete="tel-national" inputMode="numeric" pattern="[6-9][0-9]{9}" maxLength={10} value={values.phone} disabled={busy} onChange={e => setValues({ ...values, phone: e.target.value })} /></label></div><p className="muted">Your sign-in email is {email}. Contact us if you need to change it.</p><button className="primary-action" disabled={busy}>{busy ? 'Saving…' : 'Save details'}</button></form> : <dl className="profile-details"><div><dt>Name</dt><dd>{name || 'Not added'}</dd></div><div><dt>Email</dt><dd>{email}</dd></div><div><dt>Contact mobile</dt><dd>{phone ? '+91 ' + phone : 'Not added'}</dd></div></dl>}
  </section>
}
