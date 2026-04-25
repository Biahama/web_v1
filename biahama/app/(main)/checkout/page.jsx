'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCart } from '@/lib/cart'
import Script from 'next/script'

export default function CheckoutPage() {
  const router = useRouter()
  const { clear } = useCart()

  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState('')
  const [sdkReady,     setSdkReady]     = useState(false)
  const [checkout,     setCheckout]     = useState(null)

  useEffect(() => {
    const raw = sessionStorage.getItem('biahama_checkout')
    if (!raw) { router.replace('/cart'); return }
    try {
      setCheckout(JSON.parse(raw))
    } catch {
      router.replace('/cart')
    }
  }, [])

  function openRazorpay() {
    if (!sdkReady || !checkout) return
    setLoading(true)
    setError('')

    const options = {
      key:         checkout.keyId,
      amount:      checkout.amount,
      currency:    checkout.currency,
      order_id:    checkout.orderId,
      name:        'Biahama',
      description: 'Luxury Linen',
      prefill:     checkout.prefill,
      theme:       { color: '#1a1814' },
      modal: {
        ondismiss: () => setLoading(false),
      },
      handler: async (response) => {
        try {
          const res = await fetch('/api/payments/verify', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature:  response.razorpay_signature,
              addressId:           checkout.addressId,
              paymentMethod:       'razorpay',
            }),
          })

          const data = await res.json()
          if (!res.ok) { setError(data.error || 'Payment failed'); setLoading(false); return }

          sessionStorage.removeItem('biahama_checkout')
          await clear()
          router.push(`/orders/${data.orderId}`)
        } catch {
          setError('Something went wrong. Please contact support.')
          setLoading(false)
        }
      },
    }

    const rzp = new window.Razorpay(options)
    rzp.open()
  }

  async function handleCOD() {
    if (!checkout) return
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/payments/verify', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          addressId:     checkout.addressId,
          paymentMethod: 'cod',
        }),
      })

      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to place order'); setLoading(false); return }

      sessionStorage.removeItem('biahama_checkout')
      await clear()
      router.push(`/orders/${data.orderId}`)
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        onReady={() => setSdkReady(true)}
      />

      <div style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font-jost)',
        padding: '48px 24px',
      }}>
        <div style={{ width: '100%', maxWidth: 480 }}>
          <div style={{ width: 40, height: 1, background: 'var(--black)', marginBottom: 32 }} />

          <h1 style={{
            fontFamily: 'var(--font-cormorant)',
            fontSize: 36,
            fontWeight: 300,
            fontStyle: 'italic',
            color: 'var(--black)',
            marginBottom: 8,
            letterSpacing: '0.02em',
          }}>
            Complete your order
          </h1>

          <p style={{
            fontSize: 13,
            color: 'var(--gray)',
            letterSpacing: '0.05em',
            marginBottom: 48,
            textTransform: 'uppercase',
          }}>
            Choose how you'd like to pay
          </p>

          {error && (
            <div style={{
              padding: '14px 16px',
              background: '#fff0f0',
              border: '1px solid #ffcccc',
              color: '#cc0000',
              fontSize: 13,
              marginBottom: 24,
              letterSpacing: '0.02em',
            }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button
              onClick={openRazorpay}
              disabled={loading || !sdkReady || !checkout}
              style={{
                width: '100%',
                padding: '18px 24px',
                background: 'var(--black)',
                color: 'var(--white)',
                border: 'none',
                cursor: (loading || !sdkReady || !checkout) ? 'not-allowed' : 'pointer',
                fontSize: 12,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                opacity: (loading || !sdkReady || !checkout) ? 0.6 : 1,
                transition: 'opacity 0.2s',
              }}
            >
              {loading ? 'Processing…' : !sdkReady ? 'Loading…' : 'Pay Online'}
            </button>

            <button
              onClick={handleCOD}
              disabled={loading || !checkout}
              style={{
                width: '100%',
                padding: '18px 24px',
                background: 'transparent',
                color: 'var(--black)',
                border: '1px solid var(--border)',
                cursor: (loading || !checkout) ? 'not-allowed' : 'pointer',
                fontSize: 12,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                opacity: (loading || !checkout) ? 0.6 : 1,
                transition: 'opacity 0.2s',
              }}
            >
              Cash on Delivery
            </button>
          </div>

          <p style={{
            fontSize: 11,
            color: 'var(--gray)',
            letterSpacing: '0.04em',
            marginTop: 24,
            lineHeight: 1.6,
          }}>
            Payments secured by Razorpay. COD orders may have an additional handling fee.
          </p>
        </div>
      </div>
    </>
  )
}
