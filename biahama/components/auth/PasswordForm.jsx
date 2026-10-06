'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

export default function PasswordForm({ reset = false }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  async function submit(event) {
    event.preventDefault()
    setError(''); setLoading(true)
    try {
      const supabase = createClient()
      if (reset) {
        if (password !== confirmation) throw new Error('Your passwords do not match.')
        const { data: { user }, error: sessionError } = await supabase.auth.getUser()
        if (sessionError || !user) throw new Error('This reset link has expired. Please request a new link.')
        const { error: updateError } = await supabase.auth.updateUser({ password })
        if (updateError) throw updateError
        router.replace('/account'); router.refresh()
      } else {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
        })
        if (resetError) throw resetError
        setSent(true)
      }
    } catch (err) { setError(err.message) } finally { setLoading(false) }
  }
  return <main className="password-page">
    <div className="password-card">
      <Link href="/" className="password-brand">BIAHAMA</Link>
      <h1>{reset ? 'Choose a new password' : 'Forgot your password?'}</h1>
      <p>{reset ? 'Use at least eight characters for your new password.' : 'Enter your email and we’ll send you a link to reset your password.'}</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      {sent ? <p role="status">If an account exists for {email}, a reset link will arrive shortly. Please check your spam folder too.</p> : <form onSubmit={submit}>
        {reset ? <>
          <label htmlFor="new-password">New password</label>
          <input id="new-password" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={e => setPassword(e.target.value)} />
          <label htmlFor="confirm-password">Confirm password</label>
          <input id="confirm-password" type="password" autoComplete="new-password" minLength={8} required value={confirmation} onChange={e => setConfirmation(e.target.value)} />
        </> : <>
          <label htmlFor="reset-email">Email</label>
          <input id="reset-email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} />
        </>}
        <button type="submit" disabled={loading}>{loading ? 'Please wait…' : reset ? 'Save password' : 'Send reset link'}</button>
      </form>}
      <Link href={reset ? '/forgot-password' : '/?login=true'}>{reset ? 'Request a new reset link' : 'Back to login'}</Link>
    </div>
  </main>
}
