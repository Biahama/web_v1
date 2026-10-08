'use client'
import { useState } from 'react'
import Link from 'next/link'
import { returnEligibility } from '@/lib/return-policy'

const LABELS = { requested: 'Awaiting review', approved: 'Approved · follow the instructions below', received: 'Return received · being reviewed', resolved: 'Completed', rejected: 'Request declined' }

export default function ReturnRequestForm({ order }) {
  const [request, setRequest] = useState(order.returnRequest)
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState('return')
  const [selected, setSelected] = useState({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('')
    const fields = new FormData(event.currentTarget)
    try {
      const response = await fetch('/api/orders/' + order.id + '/returns', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind, reason: fields.get('reason'), details: fields.get('details'), items: Object.entries(selected).filter(([, quantity]) => quantity > 0).map(([orderItemId, quantity]) => ({ orderItemId, quantity: Number(quantity) })) }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Unable to send your request.')
      setRequest(result); setOpen(false)
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  const unavailable = returnEligibility(order)
  return <section className="account-section return-section"><div className="section-header"><div><p className="eyebrow">Let’s find the right fit</p><h2>Returns & exchanges</h2></div></div>
    {request ? <div className="return-progress" role="status"><span className="subtle-badge">{request.kind === 'exchange' ? 'Size exchange' : 'Return'} · {LABELS[request.status]}</span><p>Request #{request.id.slice(-8).toUpperCase()}</p><p>{request.customerMessage || 'Our team will review your request. Please keep your pieces unworn, unwashed, and with all tags attached.'}</p><p className="muted">For changes or additional pieces, contact customer care with this reference.</p></div> : unavailable ? <p className="muted">{unavailable}</p> : <>
      <p className="muted section-description">Request a return or size exchange within 14 days of delivery. Pieces must be unworn, unwashed, and have their tags attached. Please wait for approval before sending anything back.</p>
      {!open ? <button className="secondary-action" onClick={() => setOpen(true)}>Request a return or exchange</button> : <form className="account-form" onSubmit={submit}>
        <label>How can we help?<select value={kind} onChange={e => setKind(e.target.value)} disabled={busy}><option value="return">Return for a refund</option><option value="exchange">Exchange for another size</option></select></label>
        <fieldset className="return-items"><legend>Choose your pieces</legend>{order.items.map(item => <div key={item.id}><label className="checkbox-label"><input type="checkbox" checked={Boolean(selected[item.id])} disabled={busy} onChange={e => setSelected({ ...selected, [item.id]: e.target.checked ? item.quantity : 0 })} />{item.productName} · {item.variantDetails?.size} · {item.variantDetails?.color}</label>{selected[item.id] > 0 && <label>Quantity<input type="number" min={1} max={item.quantity} value={selected[item.id]} disabled={busy} onChange={e => setSelected({ ...selected, [item.id]: Number(e.target.value) })} /></label>}</div>)}</fieldset>
        <label>Reason<select required name="reason" disabled={busy}><option value="">Choose a reason</option><option>Size or fit</option><option>Different from expected</option><option>Damaged or incorrect piece</option><option>Other</option></select></label>
        <label>{kind === 'exchange' ? 'Requested size and any other details' : 'Anything else we should know? (optional)'}<textarea required={kind === 'exchange'} name="details" maxLength={1500} rows={3} disabled={busy} /></label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="button-row"><button className="primary-action" disabled={busy || !Object.values(selected).some(q => q > 0)}>{busy ? 'Sending…' : 'Send request'}</button><button type="button" className="text-action" disabled={busy} onClick={() => setOpen(false)}>Cancel</button></div>
      </form>}
    </>}
    <Link className="text-action" href="/contact">Contact customer care →</Link>
  </section>
}
