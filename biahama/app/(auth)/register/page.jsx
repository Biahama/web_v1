'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function RegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleStep1 = (e) => {
    e.preventDefault()
    if (!email) {
      setError('Email is required')
      return
    }
    setError('')
    setStep(2)
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
          }
        }
      })

      if (signUpError) throw signUpError

      router.push('/account')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#fafafa]" style={{ padding: '72px 100px 95px' }}>
      <div className="max-w-md mx-auto">
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '54px',
            fontWeight: 200,
            letterSpacing: '1.2px',
            color: '#262626',
            marginBottom: '58px',
            textAlign: 'center'
          }}
        >
          REGISTER
        </h1>

        {step === 1 ? (
          <form onSubmit={handleStep1} className="flex flex-col gap-6">
            <h2 style={{ fontSize: '16px', fontWeight: 400, color: '#262626', marginBottom: '8px' }}>
              1/2 ENTER YOUR E-MAIL
            </h2>
            
            <div className="flex flex-col gap-2">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email Address"
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
              {error && (
                <span style={{ fontSize: '14px', color: '#dc3545', marginTop: '4px' }}>
                  {error}
                </span>
              )}
            </div>

            <button
              type="submit"
              className="hover:opacity-80 transition-opacity"
              style={{
                width: '100%',
                height: '48px',
                background: '#262626',
                color: '#ffffff',
                fontSize: '16px',
                fontWeight: 300,
                letterSpacing: '4px',
                textTransform: 'uppercase',
                border: '1px solid #262626',
                borderRadius: 0,
                padding: '11px 33px',
                marginTop: '16px',
                cursor: 'pointer',
              }}
            >
              CONTINUE
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="flex flex-col gap-6">
            <h2 style={{ fontSize: '16px', fontWeight: 400, color: '#262626', marginBottom: '8px' }}>
              2/2 ENTER YOUR DETAILS
            </h2>
            
            <div className="flex flex-col gap-2">
              <label style={{ fontSize: '14px', fontWeight: 400, letterSpacing: '1px', color: '#262626' }}>
                First Name
              </label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                style={{
                  width: '100%',
                  height: '54px',
                  border: '1px solid #262626',
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

            <div className="flex flex-col gap-2">
              <label style={{ fontSize: '14px', fontWeight: 400, letterSpacing: '1px', color: '#262626' }}>
                Last Name
              </label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                style={{
                  width: '100%',
                  height: '54px',
                  border: '1px solid #262626',
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
                Create Password
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
              {error && (
                <span style={{ fontSize: '14px', color: '#dc3545', marginTop: '4px' }}>
                  {error}
                </span>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="hover:opacity-80 transition-opacity"
              style={{
                width: '100%',
                height: '48px',
                background: '#262626',
                color: '#ffffff',
                fontSize: '16px',
                fontWeight: 300,
                letterSpacing: '4px',
                textTransform: 'uppercase',
                border: '1px solid #262626',
                borderRadius: 0,
                padding: '11px 33px',
                marginTop: '16px',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'REGISTERING...' : 'REGISTER'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
