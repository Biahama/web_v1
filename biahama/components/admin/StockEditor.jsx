'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function StockEditor({ variantId, stockQty, sku }) {
  const router = useRouter()
  const [value, setValue] = useState(stockQty)
  const [savedStock, setSavedStock] = useState(stockQty)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState(false)
  async function save(event) {
    event.preventDefault(); setBusy(true); setMessage(''); setError(false)
    try {
      const response = await fetch('/api/admin/inventory/' + variantId, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stockQty: Number(value), expectedStock: savedStock }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to update stock.')
      setValue(data.stockQty); setSavedStock(data.stockQty); setMessage('Saved'); router.refresh()
    } catch (err) { setMessage(err.message); setError(true) } finally { setBusy(false) }
  }
  return <form className="stock-editor" onSubmit={save}><div><input aria-label={'Available stock for ' + sku} type="number" min={0} max={100000} required value={value} disabled={busy} onChange={e => setValue(e.target.value)} /><button className="text-action" disabled={busy || Number(value) === savedStock}>{busy ? 'Saving…' : 'Save'}</button></div>{message && <p className={error ? 'form-error' : 'form-success'} role={error ? 'alert' : 'status'}>{message}</p>}</form>
}
