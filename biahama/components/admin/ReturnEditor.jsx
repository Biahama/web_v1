'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
const NEXT = { requested: ['requested', 'approved', 'rejected'], approved: ['approved', 'received', 'rejected'], received: ['received', 'resolved', 'rejected'], resolved: ['resolved'], rejected: ['rejected'] }
const LABELS = { requested: 'Awaiting review', approved: 'Approved', received: 'Received', resolved: 'Resolved', rejected: 'Declined' }

export default function ReturnEditor({ request }) {
  const router = useRouter()
  const [form, setForm] = useState({ status: request.status, customerMessage: request.customerMessage || '', internalNotes: request.internalNotes || '', resolutionReference: request.resolutionReference || '' })
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState(false)
  async function save(event) {
    event.preventDefault(); setBusy(true); setMessage(''); setError(false)
    try {
      const response = await fetch('/api/admin/returns/' + request.id, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to save.')
      setMessage('Saved. The customer can see their update in order details.'); router.refresh()
    } catch (err) { setError(true); setMessage(err.message) } finally { setBusy(false) }
  }
  return <form className="account-form" onSubmit={save}><div className="form-grid"><label>Request stage<select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} disabled={busy}>{NEXT[request.status].map(s => <option key={s} value={s}>{LABELS[s]}</option>)}</select></label><label>Refund / exchange shipment reference<input maxLength={200} required={form.status === 'resolved'} readOnly={['resolved', 'rejected'].includes(request.status)} value={form.resolutionReference} onChange={e => setForm({ ...form, resolutionReference: e.target.value })} disabled={busy} /></label></div>
    <label>Update for the customer<textarea required={['approved', 'rejected', 'resolved'].includes(form.status)} rows={3} maxLength={1500} value={form.customerMessage} onChange={e => setForm({ ...form, customerMessage: e.target.value })} disabled={busy} /></label>
    <label>Internal notes · only visible to admins<textarea rows={2} maxLength={2000} value={form.internalNotes} onChange={e => setForm({ ...form, internalNotes: e.target.value })} disabled={busy} /></label>
    {form.status === 'resolved' && <p className="muted">Resolve only after the refund has been completed in Razorpay (or your COD refund method), or the replacement has shipped. Saving this form does not issue a refund, create a shipment, or restock a piece. Inspect returned goods before adjusting inventory.</p>}
    {message && <p className={error ? 'form-error' : 'form-success'} role={error ? 'alert' : 'status'}>{message}</p>}<button className="primary-action" disabled={busy}>{busy ? 'Saving…' : 'Save request'}</button>
  </form>
}
