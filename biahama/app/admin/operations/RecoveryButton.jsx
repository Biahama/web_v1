'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
export default function RecoveryButton() {
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  async function run() {
    setLoading(true); setMessage('')
    try {
      const response = await fetch('/api/admin/maintenance', { method: 'POST' })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || `${result.failures} checkout(s) need attention. See Errors.`)
      setMessage(`Checked ${result.checked} checkouts and ${result.tasks} queued tasks.`)
      router.refresh()
    } catch (error) { setMessage(error.message) } finally { setLoading(false) }
  }
  return <div><button onClick={run} disabled={loading} style={{ background: '#1A202C', color: '#fff', padding: '12px 20px', cursor: 'pointer' }}>{loading ? 'Checking…' : 'Run recovery now'}</button><p role="status">{message}</p></div>
}
