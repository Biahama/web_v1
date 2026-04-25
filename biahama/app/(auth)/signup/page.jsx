'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SignupPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Something went wrong')
      setLoading(false)
      return
    }

    await signIn('credentials', {
      email: form.email,
      password: form.password,
      redirect: false,
    })

    router.push('/')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-md px-8 py-12">
        <h1
          className="text-3xl text-center mb-10 tracking-widest"
          style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 300, fontStyle: 'italic', color: 'var(--black)' }}
        >
          Create Account
        </h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          {[
            { label: 'Full Name', key: 'name', type: 'text' },
            { label: 'Email',     key: 'email', type: 'email' },
            { label: 'Phone',     key: 'phone', type: 'tel' },
            { label: 'Password',  key: 'password', type: 'password' },
          ].map(({ label, key, type }) => (
            <div key={key}>
              <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--gray)', fontFamily: 'Jost, sans-serif' }}>
                {label}
              </label>
              <input
                type={type}
                required={key !== 'phone'}
                value={form[key]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                className="w-full px-4 py-3 text-sm outline-none"
                style={{ background: 'var(--white)', border: '1px solid var(--border)', color: 'var(--black)', fontFamily: 'Jost, sans-serif' }}
              />
            </div>
          ))}

          {error && (
            <p className="text-xs text-center" style={{ color: '#c0392b', fontFamily: 'Jost, sans-serif' }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 text-xs tracking-widest uppercase transition-opacity"
            style={{ background: 'var(--black)', color: 'var(--white)', fontFamily: 'Jost, sans-serif', opacity: loading ? 0.6 : 1 }}
          >
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <p className="text-center mt-8 text-xs" style={{ color: 'var(--gray)', fontFamily: 'Jost, sans-serif' }}>
          Already have an account?{' '}
          <Link href="/login" className="underline" style={{ color: 'var(--black)' }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
