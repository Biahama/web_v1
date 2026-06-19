'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'

export default function LoginDrawer({ open, onClose }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // Prevent background scrolling when drawer is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [open])

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      setError('Invalid email or password.')
      setLoading(false)
    } else {
      setLoading(false)
      onClose()
      router.refresh()
    }
  }

  return (
    <>
      {/* Dark Overlay */}
      <div 
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 199,
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 0.3s ease',
        }}
      />

      {/* Drawer */}
      <div style={{
        position: 'fixed',
        top: 0,
        right: 0,
        width: 400,
        height: '100vh',
        background: '#ffffff',
        zIndex: 200,
        padding: '48px 40px',
        overflowY: 'auto',
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.3s ease',
      }}>
        {/* Close button */}
        <button 
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 20,
            right: 20,
            fontSize: 20,
            cursor: 'pointer',
            background: 'none',
            border: 'none',
            color: '#262626',
            lineHeight: 1,
            padding: 4,
          }}
          aria-label="Close"
        >
          &times;
        </button>

        {/* Header */}
        <div style={{
          fontFamily: 'var(--font-ui)',
          fontSize: 16,
          fontWeight: 400,
          letterSpacing: 2,
          textTransform: 'uppercase',
          color: '#262626',
          marginBottom: 32,
          display: 'flex',
          alignItems: 'center',
          gap: 12
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          LOG IN
        </div>

        {error && (
          <div style={{ padding: '12px 16px', background: '#fff0f0', border: '1px solid #ffcccc', color: '#cc0000', fontSize: 12, marginBottom: 20, fontFamily: 'var(--font-ui)' }}>
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 400, letterSpacing: 1, color: '#262626', marginBottom: 8, fontFamily: 'var(--font-ui)' }}>
              Enter e-mail *
            </label>
            <input 
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={{
                width: '100%',
                height: 54,
                border: '1px solid #262626',
                borderRadius: 0,
                padding: '14px 12px',
                fontSize: 16,
                letterSpacing: 0.6,
                fontFamily: 'var(--font-ui)',
                outline: 'none',
                background: 'transparent'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 400, letterSpacing: 1, color: '#262626', marginBottom: 8, fontFamily: 'var(--font-ui)' }}>
              Password *
            </label>
            <div style={{ position: 'relative' }}>
              <input 
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  height: 54,
                  border: '1px solid #262626',
                  borderRadius: 0,
                  padding: '14px 40px 14px 12px',
                  fontSize: 16,
                  letterSpacing: 0.6,
                  fontFamily: 'var(--font-ui)',
                  outline: 'none',
                  background: 'transparent'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#262626',
                  padding: 0,
                  display: 'flex'
                }}
              >
                {showPassword ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                )}
              </button>
            </div>
            
            <div style={{ marginTop: 12 }}>
              <Link 
                href="/forgot-password" 
                style={{
                  fontSize: 16,
                  fontWeight: 400,
                  color: '#262626',
                  textDecoration: 'underline',
                  fontFamily: 'var(--font-ui)'
                }}
              >
                forgotten password?
              </Link>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              height: 54,
              background: '#262626',
              color: '#ffffff',
              fontSize: 16,
              fontWeight: 300,
              letterSpacing: 4,
              textTransform: 'uppercase',
              border: 'none',
              marginTop: 24,
              cursor: 'pointer',
              fontFamily: 'var(--font-ui)'
            }}
          >
            {loading ? 'LOGGING IN...' : 'LOGIN'}
          </button>
        </form>

        <div style={{ height: 1, width: '100%', background: '#e5e5e5', margin: '32px 0' }} />

        {/* Register Section */}
        <div>
          <h3 style={{
            fontSize: 14,
            fontWeight: 400,
            letterSpacing: 2,
            textTransform: 'uppercase',
            color: '#262626',
            marginBottom: 12,
            fontFamily: 'var(--font-ui)',
            margin: '0 0 12px 0'
          }}>
            CREATE AN ACCOUNT
          </h3>
          <p style={{
            fontSize: 14,
            fontWeight: 300,
            lineHeight: '20px',
            color: '#6f6f6f',
            marginBottom: 24,
            fontFamily: 'var(--font-ui)',
            margin: '0 0 24px 0'
          }}>
            Enjoy a personalized experience and discover all the exclusive services.
          </p>
          <button
            onClick={() => {
              onClose();
              router.push('/register');
            }}
            style={{
              width: '100%',
              height: 54,
              background: '#262626',
              color: '#ffffff',
              fontSize: 16,
              fontWeight: 300,
              letterSpacing: 4,
              textTransform: 'uppercase',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'var(--font-ui)'
            }}
          >
            REGISTER
          </button>
        </div>
      </div>
    </>
  )
}
