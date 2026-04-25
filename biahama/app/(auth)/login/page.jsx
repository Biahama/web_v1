'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/'

  const [email,   setEmail]   = useState('')
  const [step,    setStep]    = useState('email') // 'email' | 'password'
  const [password, setPassword] = useState('')
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  async function handleEmailSubmit(e) {
    e.preventDefault()
    if (!email) return
    setStep('password')
  }

  async function handleSignIn(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const res = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    setLoading(false)

    if (res?.error) {
      setError('Invalid email or password')
    } else {
      router.push(callbackUrl)
      router.refresh()
    }
  }

  async function handleGoogle() {
    await signIn('google', { callbackUrl })
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#ffffff' }}>
      {/* Left — campaign image */}
      <div
        className="hidden md:block flex-1"
        style={{ background: '#e8e4de', position: 'relative' }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            style={{
              fontFamily: 'Cormorant Garamond, serif',
              fontWeight: 300,
              fontStyle: 'italic',
              fontSize: 'clamp(3rem, 8vw, 6rem)',
              color: '#ddd9d3',
              letterSpacing: '-0.02em',
              lineHeight: 1,
            }}
          >
            Biahama
          </span>
        </div>
      </div>

      {/* Right — form */}
      <div className="flex-1 flex flex-col" style={{ background: '#ffffff', minHeight: '100vh' }}>
        {/* Top bar */}
        <div
          className="flex items-center justify-between"
          style={{ padding: '20px 40px', borderBottom: '1px solid #f0ede8' }}
        >
          <Link
            href="/"
            className="flex items-center gap-2 transition-opacity hover:opacity-50"
            style={{ fontFamily: 'Jost, sans-serif', fontWeight: 300, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#1a1814' }}
          >
            ← Back
          </Link>
          <Link
            href="/"
            style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 300, fontSize: 22, letterSpacing: '0.25em', color: '#1a1814', position: 'absolute', left: '75%', transform: 'translateX(-50%)' }}
          >
            BIAHAMA
          </Link>
          <div />
        </div>

        {/* Form container */}
        <div className="flex-1 flex items-center justify-center px-8 py-16">
          <div style={{ width: '100%', maxWidth: 420 }}>
            <p
              className="mb-8 text-center"
              style={{ fontFamily: 'Jost, sans-serif', fontWeight: 300, fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#1a1814' }}
            >
              Sign in or create an account
            </p>

            {step === 'email' ? (
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <input
                  type="email"
                  required
                  placeholder="Email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full outline-none"
                  style={{
                    fontFamily: 'Jost, sans-serif',
                    fontWeight: 300,
                    fontSize: 13,
                    color: '#1a1814',
                    border: '1px solid #ddd9d3',
                    background: '#ffffff',
                    padding: '14px 16px',
                    letterSpacing: '0.02em',
                  }}
                />

                <p style={{ fontFamily: 'Jost, sans-serif', fontWeight: 300, fontSize: 10, color: '#8a8480', lineHeight: 1.6, letterSpacing: '0.02em' }}>
                  By continuing, you agree to our{' '}
                  <Link href="/privacy" style={{ textDecoration: 'underline', color: '#8a8480' }}>Privacy Policy</Link>
                  {' '}and{' '}
                  <Link href="/terms" style={{ textDecoration: 'underline', color: '#8a8480' }}>Terms of Service</Link>.
                </p>

                <button
                  type="submit"
                  className="w-full transition-opacity hover:opacity-70"
                  style={{
                    fontFamily: 'Jost, sans-serif',
                    fontWeight: 300,
                    fontSize: 11,
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    color: '#1a1814',
                    background: '#ffffff',
                    border: '1px solid #1a1814',
                    padding: '14px 16px',
                    cursor: 'pointer',
                  }}
                >
                  Continue
                </button>
              </form>
            ) : (
              <form onSubmit={handleSignIn} className="space-y-4">
                <div style={{ fontFamily: 'Jost, sans-serif', fontSize: 12, color: '#8a8480', marginBottom: 4 }}>
                  {email}{' '}
                  <button type="button" onClick={() => setStep('email')} style={{ textDecoration: 'underline', color: '#1a1814', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Jost, sans-serif', fontSize: 12 }}>
                    Change
                  </button>
                </div>
                <input
                  type="password"
                  required
                  placeholder="Password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoFocus
                  className="w-full outline-none"
                  style={{
                    fontFamily: 'Jost, sans-serif',
                    fontWeight: 300,
                    fontSize: 13,
                    color: '#1a1814',
                    border: '1px solid #ddd9d3',
                    background: '#ffffff',
                    padding: '14px 16px',
                  }}
                />

                {error && (
                  <p style={{ fontFamily: 'Jost, sans-serif', fontSize: 11, color: '#c0392b' }}>{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full transition-opacity hover:opacity-70"
                  style={{
                    fontFamily: 'Jost, sans-serif',
                    fontWeight: 300,
                    fontSize: 11,
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    color: '#1a1814',
                    background: '#ffffff',
                    border: '1px solid #1a1814',
                    padding: '14px 16px',
                    cursor: 'pointer',
                    opacity: loading ? 0.6 : 1,
                  }}
                >
                  {loading ? 'Signing in…' : 'Sign In'}
                </button>

                <p style={{ fontFamily: 'Jost, sans-serif', fontWeight: 300, fontSize: 11, color: '#8a8480', textAlign: 'center' }}>
                  No account?{' '}
                  <Link href="/signup" style={{ color: '#1a1814', textDecoration: 'underline' }}>Create one</Link>
                </p>
              </form>
            )}

            {/* Divider */}
            <div className="flex items-center my-6">
              <div className="flex-1" style={{ height: 1, background: '#ddd9d3' }} />
              <span style={{ padding: '0 16px', fontFamily: 'Jost, sans-serif', fontWeight: 300, fontSize: 10, letterSpacing: '0.1em', color: '#8a8480', textTransform: 'uppercase' }}>
                Or
              </span>
              <div className="flex-1" style={{ height: 1, background: '#ddd9d3' }} />
            </div>

            <button
              onClick={handleGoogle}
              className="w-full transition-opacity hover:opacity-70"
              style={{
                fontFamily: 'Jost, sans-serif',
                fontWeight: 300,
                fontSize: 11,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: '#1a1814',
                background: '#ffffff',
                border: '1px solid #ddd9d3',
                padding: '14px 16px',
                cursor: 'pointer',
              }}
            >
              Continue with Google
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
