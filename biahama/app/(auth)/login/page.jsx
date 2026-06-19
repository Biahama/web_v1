'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) throw signInError

      router.push('/account')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      {/* Left Half: Login Form */}
      <div className="flex-1 flex flex-col items-center justify-center bg-white p-8">
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '54px',
            fontWeight: 200,
            letterSpacing: '1.2px',
            color: '#262626',
          }}
        >
          LOGIN
        </h1>

        <div style={{ marginTop: '58px', padding: '0 80px', maxWidth: '430px', width: '100%' }}>
          <form onSubmit={handleLogin} className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <label style={{ fontSize: '14px', fontWeight: 400, letterSpacing: '1px', color: '#262626' }}>
                EMAIL
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  height: '54px',
                  border: error ? '1px solid #dc3545' : '1px solid #262626',
                  borderRadius: 0,
                  background: 'transparent',
                  padding: '14px 12px',
                  fontFamily: 'var(--font-ui)',
                  fontSize: '16px',
                  fontWeight: 400,
                  letterSpacing: '0.6px',
                  outline: 'none',
                }}
              />
            </div>

            <div className="flex flex-col gap-2 relative">
              <label style={{ fontSize: '14px', fontWeight: 400, letterSpacing: '1px', color: '#262626' }}>
                PASSWORD
              </label>
              <div className="relative w-full">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: '100%',
                    height: '54px',
                    border: error ? '1px solid #dc3545' : '1px solid #262626',
                    borderRadius: 0,
                    background: 'transparent',
                    padding: '14px 40px 14px 12px',
                    fontFamily: 'var(--font-ui)',
                    fontSize: '16px',
                    fontWeight: 400,
                    letterSpacing: '0.6px',
                    outline: 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#262626" strokeWidth="1.5">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                      <line x1="2" y1="2" x2="22" y2="22" />
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#262626" strokeWidth="1.5">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
              <div className="mt-1 flex justify-between items-start">
                {error ? (
                  <span style={{ fontSize: '14px', color: '#dc3545', marginTop: '4px' }}>
                    {error}
                  </span>
                ) : (
                  <span />
                )}
                <Link
                  href="/forgot-password"
                  style={{
                    fontSize: '16px',
                    fontWeight: 400,
                    color: '#262626',
                    textDecoration: 'none',
                    marginTop: '4px',
                  }}
                >
                  Forgot your password?
                </Link>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="hover:opacity-80 transition-opacity"
              style={{
                width: '100%',
                height: '54px',
                background: '#262626',
                color: '#ffffff',
                fontSize: '16px',
                fontWeight: 300,
                letterSpacing: '4px',
                textTransform: 'uppercase',
                border: 'none',
                borderRadius: 0,
                padding: '15px 33px',
                marginTop: '16px',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'LOGGING IN...' : 'LOGIN'}
            </button>
          </form>
        </div>
      </div>

      {/* Right Half: Create an Account Panel */}
      <div className="flex-1 flex flex-col items-center justify-center bg-[#fafafa] p-8 border-l border-[#e5e5e5]">
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '36px',
            fontWeight: 200,
            letterSpacing: '1px',
            color: '#262626',
            marginBottom: '32px',
          }}
        >
          NEW CUSTOMER
        </h2>
        <p
          className="text-center max-w-sm mb-12"
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize: '16px',
            fontWeight: 400,
            color: '#6f6f6f',
            lineHeight: 1.6,
          }}
        >
          Create an account to check out faster, track your orders, and save your favorite items.
        </p>
        <Link
          href="/register"
          className="flex items-center justify-center hover:opacity-80 transition-opacity"
          style={{
            width: '100%',
            maxWidth: '300px',
            height: '54px',
            background: 'transparent',
            color: '#262626',
            fontSize: '16px',
            fontWeight: 300,
            letterSpacing: '4px',
            textTransform: 'uppercase',
            border: '1px solid #262626',
            borderRadius: 0,
            textDecoration: 'none',
          }}
        >
          REGISTER
        </Link>
      </div>
    </div>
  )
}
