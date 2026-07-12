'use client'

// ============================================================
// REGISTER — one single page (no steps), styled to match the
// site: Cormorant Garamond heading, Jost inputs like the login
// drawer, soft background, centered card.
// Also offers "Continue with Google" — no password needed.
// ============================================================

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

// Shared input style — same family as the login drawer.
const inputStyle = {
  width: '100%',
  height: 54,
  border: '1px solid #d9d5cf',
  borderRadius: 0,
  padding: '14px 12px',
  fontSize: 15,
  letterSpacing: 0.6,
  fontFamily: 'var(--font-ui)',
  outline: 'none',
  background: '#ffffff',
  color: '#262626',
}

const labelStyle = {
  display: 'block',
  fontSize: 12,
  fontWeight: 400,
  letterSpacing: 1.5,
  textTransform: 'uppercase',
  color: '#6f6f6f',
  marginBottom: 8,
  fontFamily: 'var(--font-ui)',
}

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirmationSent, setConfirmationSent] = useState(false)

  async function handleRegister(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { first_name: firstName, last_name: lastName },
          // After clicking the email link, land back on OUR site —
          // /auth/callback signs them in and sends them home.
          // (Fixes the old bug where the link went to localhost.)
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (signUpError) throw signUpError

      if (data?.user && !data?.session) {
        // Email confirmation is on — tell them to check their inbox.
        setConfirmationSent(true)
      } else {
        router.push('/')
        router.refresh()
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle() {
    setError('')
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (oauthError) setError(oauthError.message)
    // On success the browser navigates to Google — nothing else to do here.
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f7f6f4',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '96px 24px 64px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 460,
          background: '#ffffff',
          border: '1px solid #e5e5e5',
          padding: '56px 48px',
        }}
      >
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontStyle: 'italic',
            fontSize: 38,
            fontWeight: 300,
            letterSpacing: 1,
            color: '#262626',
            textAlign: 'center',
            margin: '0 0 8px 0',
          }}
        >
          Register
        </h1>
        <p
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize: 13,
            fontWeight: 300,
            color: '#6f6f6f',
            textAlign: 'center',
            margin: '0 0 36px 0',
            lineHeight: 1.6,
          }}
        >
          Create your Biahama account for a personalized experience.
        </p>

        {confirmationSent ? (
          // Success state — replaces the form.
          <div style={{ textAlign: 'center', fontFamily: 'var(--font-ui)' }}>
            <p style={{ fontSize: 15, color: '#262626', lineHeight: 1.7, margin: '0 0 24px 0' }}>
              Almost done! We&apos;ve sent a confirmation link to<br />
              <strong>{email}</strong>.<br />
              Click it, and you&apos;ll be signed in automatically.
            </p>
            <p style={{ fontSize: 12, color: '#6f6f6f', margin: 0 }}>
              Nothing arriving? Check your spam folder.
            </p>
          </div>
        ) : (
          <>
            {/* Continue with Google */}
            <button
              type="button"
              onClick={handleGoogle}
              style={{
                width: '100%',
                height: 54,
                background: '#ffffff',
                border: '1px solid #262626',
                color: '#262626',
                fontSize: 14,
                fontWeight: 400,
                letterSpacing: 1.5,
                textTransform: 'uppercase',
                cursor: 'pointer',
                fontFamily: 'var(--font-ui)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
              Continue with Google
            </button>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, margin: '28px 0' }}>
              <div style={{ flex: 1, height: 1, background: '#e5e5e5' }} />
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, letterSpacing: 2, color: '#6f6f6f' }}>OR</span>
              <div style={{ flex: 1, height: 1, background: '#e5e5e5' }} />
            </div>

            {error && (
              <div
                style={{
                  padding: '12px 16px',
                  background: '#fff0f0',
                  border: '1px solid #ffcccc',
                  color: '#cc0000',
                  fontSize: 12,
                  marginBottom: 20,
                  fontFamily: 'var(--font-ui)',
                }}
              >
                {error}
              </div>
            )}

            {/* One single form — no steps. */}
            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>First name *</label>
                  <input type="text" required value={firstName} onChange={(e) => setFirstName(e.target.value)} style={inputStyle} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Last name *</label>
                  <input type="text" required value={lastName} onChange={(e) => setLastName(e.target.value)} style={inputStyle} />
                </div>
              </div>

              <div>
                <label style={labelStyle}>E-mail *</label>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>Password *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ ...inputStyle, paddingRight: 44 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label="Show password"
                    style={{
                      position: 'absolute',
                      right: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#6f6f6f',
                      padding: 0,
                      display: 'flex',
                    }}
                  >
                    {showPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
                <p style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: '#6f6f6f', margin: '6px 0 0 0' }}>
                  At least 8 characters.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  height: 54,
                  background: '#262626',
                  color: '#ffffff',
                  fontSize: 14,
                  fontWeight: 300,
                  letterSpacing: 4,
                  textTransform: 'uppercase',
                  border: 'none',
                  marginTop: 8,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-ui)',
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? 'CREATING ACCOUNT...' : 'REGISTER'}
              </button>
            </form>

            <p
              style={{
                fontFamily: 'var(--font-ui)',
                fontSize: 13,
                color: '#6f6f6f',
                textAlign: 'center',
                margin: '28px 0 0 0',
              }}
            >
              Already have an account?{' '}
              <a href="/?login=true" style={{ color: '#262626', textDecoration: 'underline' }}>
                Log in
              </a>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
