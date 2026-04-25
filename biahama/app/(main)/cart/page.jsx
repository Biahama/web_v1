'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useCart } from '@/lib/cart'

const SHIPPING_THRESHOLD = 300000 // ₹3000 in paise
const SHIPPING_COST      = 9900   // ₹99 in paise
const GST_RATE           = 0.05

function formatPrice(paise) {
  return `₹${(paise / 100).toLocaleString('en-IN')}`
}

async function fetchPincodeData(pincode) {
  const res = await fetch(`https://api.postalpincode.in/pincode/${pincode}`)
  const data = await res.json()
  if (data[0]?.Status === 'Success') {
    const po = data[0].PostOffice[0]
    return { city: po.District, state: po.State }
  }
  return null
}

const EMPTY_ADDRESS = { fullName: '', phone: '', line1: '', line2: '', pincode: '', city: '', state: '', isDefault: false }

export default function CartPage() {
  const { items, remove, updateQty } = useCart()
  const { data: session } = useSession()
  const router = useRouter()

  const [addresses,        setAddresses]        = useState([])
  const [selectedAddress,  setSelectedAddress]  = useState(null)
  const [showAddressForm,  setShowAddressForm]  = useState(false)
  const [addressForm,      setAddressForm]      = useState(EMPTY_ADDRESS)
  const [pincodeLoading,   setPincodeLoading]   = useState(false)
  const [saving,           setSaving]           = useState(false)
  const [submitting,       setSubmitting]       = useState(false)
  const [error,            setError]            = useState('')

  useEffect(() => {
    if (session) {
      fetch('/api/addresses')
        .then(r => r.json())
        .then(data => {
          setAddresses(data)
          const def = data.find(a => a.isDefault) || data[0]
          if (def) setSelectedAddress(def.id)
        })
        .catch(() => {})
    }
  }, [session])

  async function handlePincodeChange(value) {
    setAddressForm(f => ({ ...f, pincode: value, city: '', state: '' }))
    if (value.length === 6) {
      setPincodeLoading(true)
      const result = await fetchPincodeData(value)
      setPincodeLoading(false)
      if (result) setAddressForm(f => ({ ...f, city: result.city, state: result.state }))
    }
  }

  async function handleSaveAddress(e) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const res = await fetch('/api/addresses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(addressForm),
    })

    const data = await res.json()
    setSaving(false)

    if (!res.ok) { setError(data.error || 'Failed to save address'); return }

    setAddresses(prev => [...prev, data])
    setSelectedAddress(data.id)
    setShowAddressForm(false)
    setAddressForm(EMPTY_ADDRESS)
  }

  async function handleProceed() {
    if (!session) { router.push('/login?callbackUrl=/cart'); return }
    if (!selectedAddress && !showAddressForm) { setError('Please select or add a delivery address'); return }

    setSubmitting(true)
    setError('')

    const res = await fetch('/api/payments/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ addressId: selectedAddress }),
    })

    setSubmitting(false)

    if (!res.ok) { setError('Could not initiate payment. Please try again.'); return }

    const data = await res.json()
    sessionStorage.setItem('biahama_checkout', JSON.stringify({ ...data, addressId: selectedAddress }))
    router.push('/checkout')
  }

  const subtotal = items.reduce((s, i) => s + i.variant.price * i.quantity, 0)
  const shipping  = subtotal >= SHIPPING_THRESHOLD ? 0 : SHIPPING_COST
  const gst       = Math.round(subtotal * GST_RATE)
  const total     = subtotal + shipping + gst

  return (
    <div style={{ paddingLeft: 48, paddingRight: 48, paddingTop: 40, paddingBottom: 80 }}>
      <h1
        className="mb-10"
        style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 300, fontStyle: 'italic', fontSize: 'clamp(2rem, 5vw, 3.5rem)', color: 'var(--black)', lineHeight: 1 }}
      >
        Your Cart
      </h1>

      {items.length === 0 ? (
        <div className="py-20 text-center">
          <p style={{ fontFamily: 'Jost, sans-serif', fontWeight: 300, fontSize: 14, color: 'var(--gray)', marginBottom: 24 }}>
            Your cart is empty.
          </p>
          <Link
            href="/shop"
            style={{ fontFamily: 'Jost, sans-serif', fontWeight: 300, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--black)', borderBottom: '1px solid var(--black)', paddingBottom: 2 }}
          >
            Continue Shopping
          </Link>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-12">
          {/* Left — cart items */}
          <div className="flex-1">
            <div style={{ borderTop: '1px solid var(--border)' }}>
              {items.map(({ variantId, variant, quantity }) => (
                <div
                  key={variantId}
                  className="flex gap-6 py-6"
                  style={{ borderBottom: '1px solid var(--border)' }}
                >
                  {/* Image */}
                  <div className="shrink-0" style={{ width: 90, height: 120, background: 'var(--light)' }} />

                  {/* Details */}
                  <div className="flex-1">
                    <p style={{ fontFamily: 'Jost, sans-serif', fontWeight: 300, fontSize: 13, color: 'var(--black)', marginBottom: 4 }}>
                      {variant.product?.name || 'Product'}
                    </p>
                    <p style={{ fontFamily: 'Jost, sans-serif', fontWeight: 300, fontSize: 11, color: 'var(--gray)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>
                      {variant.size} · {variant.color}
                    </p>

                    <div className="flex items-center justify-between">
                      {/* Qty controls */}
                      <div className="flex items-center" style={{ border: '1px solid var(--border)' }}>
                        <button
                          onClick={() => updateQty(variantId, quantity - 1)}
                          className="hover:opacity-60 transition-opacity"
                          style={{ width: 32, height: 32, fontFamily: 'Jost, sans-serif', fontSize: 16, color: 'var(--black)', background: 'none', border: 'none', cursor: 'pointer' }}
                        >
                          −
                        </button>
                        <span style={{ width: 32, textAlign: 'center', fontFamily: 'Jost, sans-serif', fontWeight: 300, fontSize: 12, color: 'var(--black)' }}>
                          {quantity}
                        </span>
                        <button
                          onClick={() => updateQty(variantId, quantity + 1)}
                          className="hover:opacity-60 transition-opacity"
                          style={{ width: 32, height: 32, fontFamily: 'Jost, sans-serif', fontSize: 16, color: 'var(--black)', background: 'none', border: 'none', cursor: 'pointer' }}
                        >
                          +
                        </button>
                      </div>

                      <div className="flex items-center gap-6">
                        <span style={{ fontFamily: 'Jost, sans-serif', fontWeight: 400, fontSize: 13, color: 'var(--black)' }}>
                          {formatPrice(variant.price * quantity)}
                        </span>
                        <button
                          onClick={() => remove(variantId)}
                          className="hover:opacity-50 transition-opacity"
                          style={{ fontFamily: 'Jost, sans-serif', fontWeight: 300, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--gray)', background: 'none', border: 'none', cursor: 'pointer' }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — address + summary */}
          <div style={{ width: '100%', maxWidth: 380 }}>
            {/* Delivery address */}
            <div className="mb-8">
              <h2
                className="mb-5"
                style={{ fontFamily: 'Jost, sans-serif', fontWeight: 300, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--black)' }}
              >
                Delivery Address
              </h2>

              {!session && (
                <p style={{ fontFamily: 'Jost, sans-serif', fontWeight: 300, fontSize: 12, color: 'var(--gray)', marginBottom: 12 }}>
                  <Link href="/login?callbackUrl=/cart" style={{ color: 'var(--black)', textDecoration: 'underline' }}>Sign in</Link>
                  {' '}to use saved addresses.
                </p>
              )}

              {/* Saved addresses */}
              {addresses.length > 0 && (
                <div className="space-y-3 mb-4">
                  {addresses.map(addr => (
                    <label
                      key={addr.id}
                      className="flex gap-3 cursor-pointer p-4"
                      style={{
                        border: selectedAddress === addr.id ? '1px solid var(--black)' : '1px solid var(--border)',
                        background: 'var(--white)',
                      }}
                    >
                      <input
                        type="radio"
                        name="address"
                        checked={selectedAddress === addr.id}
                        onChange={() => { setSelectedAddress(addr.id); setShowAddressForm(false) }}
                        style={{ marginTop: 2, accentColor: 'var(--black)' }}
                      />
                      <div>
                        <p style={{ fontFamily: 'Jost, sans-serif', fontWeight: 400, fontSize: 12, color: 'var(--black)', marginBottom: 2 }}>
                          {addr.fullName}
                        </p>
                        <p style={{ fontFamily: 'Jost, sans-serif', fontWeight: 300, fontSize: 11, color: 'var(--gray)', lineHeight: 1.6 }}>
                          {addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}<br />
                          {addr.city}, {addr.state} — {addr.pincode}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              )}

              {/* Add new address toggle */}
              {!showAddressForm && session && (
                <button
                  onClick={() => { setShowAddressForm(true); setSelectedAddress(null) }}
                  style={{ fontFamily: 'Jost, sans-serif', fontWeight: 300, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--black)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  + Add new address
                </button>
              )}

              {/* Address form */}
              {(showAddressForm || !session) && (
                <form onSubmit={handleSaveAddress} className="space-y-3 mt-4">
                  {[
                    { label: 'Full Name',  key: 'fullName', type: 'text' },
                    { label: 'Phone',      key: 'phone',    type: 'tel' },
                    { label: 'Address Line 1', key: 'line1', type: 'text' },
                    { label: 'Address Line 2 (optional)', key: 'line2', type: 'text', required: false },
                  ].map(({ label, key, type, required = true }) => (
                    <div key={key}>
                      <label style={{ fontFamily: 'Jost, sans-serif', fontWeight: 300, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--gray)', display: 'block', marginBottom: 4 }}>
                        {label}
                      </label>
                      <input
                        type={type}
                        required={required}
                        value={addressForm[key]}
                        onChange={e => setAddressForm(f => ({ ...f, [key]: e.target.value }))}
                        className="w-full outline-none"
                        style={{ border: '1px solid var(--border)', padding: '10px 12px', fontFamily: 'Jost, sans-serif', fontWeight: 300, fontSize: 12, color: 'var(--black)', background: 'var(--white)' }}
                      />
                    </div>
                  ))}

                  {/* Pincode */}
                  <div>
                    <label style={{ fontFamily: 'Jost, sans-serif', fontWeight: 300, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--gray)', display: 'block', marginBottom: 4 }}>
                      Pincode
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      value={addressForm.pincode}
                      onChange={e => handlePincodeChange(e.target.value.replace(/\D/g, ''))}
                      className="w-full outline-none"
                      style={{ border: '1px solid var(--border)', padding: '10px 12px', fontFamily: 'Jost, sans-serif', fontWeight: 300, fontSize: 12, color: 'var(--black)', background: 'var(--white)' }}
                    />
                    {pincodeLoading && <p style={{ fontFamily: 'Jost, sans-serif', fontSize: 10, color: 'var(--gray)', marginTop: 4 }}>Looking up pincode…</p>}
                  </div>

                  {/* City + State (auto-filled) */}
                  <div className="grid grid-cols-2 gap-3">
                    {[{ label: 'City', key: 'city' }, { label: 'State', key: 'state' }].map(({ label, key }) => (
                      <div key={key}>
                        <label style={{ fontFamily: 'Jost, sans-serif', fontWeight: 300, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--gray)', display: 'block', marginBottom: 4 }}>
                          {label}
                        </label>
                        <input
                          type="text"
                          required
                          value={addressForm[key]}
                          onChange={e => setAddressForm(f => ({ ...f, [key]: e.target.value }))}
                          className="w-full outline-none"
                          style={{ border: '1px solid var(--border)', padding: '10px 12px', fontFamily: 'Jost, sans-serif', fontWeight: 300, fontSize: 12, color: 'var(--black)', background: addressForm[key] ? 'var(--light)' : 'var(--white)' }}
                        />
                      </div>
                    ))}
                  </div>

                  {session && (
                    <div className="flex gap-2 items-center">
                      <input
                        type="checkbox"
                        id="isDefault"
                        checked={addressForm.isDefault}
                        onChange={e => setAddressForm(f => ({ ...f, isDefault: e.target.checked }))}
                        style={{ accentColor: 'var(--black)' }}
                      />
                      <label htmlFor="isDefault" style={{ fontFamily: 'Jost, sans-serif', fontWeight: 300, fontSize: 11, color: 'var(--gray)', cursor: 'pointer' }}>
                        Save as default address
                      </label>
                    </div>
                  )}

                  {session && (
                    <button
                      type="submit"
                      disabled={saving}
                      className="w-full transition-opacity hover:opacity-70"
                      style={{ fontFamily: 'Jost, sans-serif', fontWeight: 300, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--black)', background: 'var(--white)', border: '1px solid var(--border)', padding: '12px 16px', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}
                    >
                      {saving ? 'Saving…' : 'Save Address'}
                    </button>
                  )}
                </form>
              )}
            </div>

            {/* Order summary */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 24 }}>
              <h2
                className="mb-5"
                style={{ fontFamily: 'Jost, sans-serif', fontWeight: 300, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--black)' }}
              >
                Order Summary
              </h2>

              <div className="space-y-3 mb-6">
                {[
                  { label: 'Subtotal', value: formatPrice(subtotal) },
                  { label: `Shipping${shipping === 0 ? ' (Free)' : ''}`, value: shipping === 0 ? 'Free' : formatPrice(shipping) },
                  { label: 'GST (5%)', value: formatPrice(gst) },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between">
                    <span style={{ fontFamily: 'Jost, sans-serif', fontWeight: 300, fontSize: 12, color: 'var(--gray)' }}>{label}</span>
                    <span style={{ fontFamily: 'Jost, sans-serif', fontWeight: 300, fontSize: 12, color: 'var(--black)' }}>{value}</span>
                  </div>
                ))}
                <div className="flex justify-between pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                  <span style={{ fontFamily: 'Jost, sans-serif', fontWeight: 400, fontSize: 13, color: 'var(--black)' }}>Total</span>
                  <span style={{ fontFamily: 'Jost, sans-serif', fontWeight: 400, fontSize: 13, color: 'var(--black)' }}>{formatPrice(total)}</span>
                </div>
              </div>

              {shipping > 0 && (
                <p style={{ fontFamily: 'Jost, sans-serif', fontWeight: 300, fontSize: 10, color: 'var(--gray)', marginBottom: 16, letterSpacing: '0.05em' }}>
                  Add {formatPrice(SHIPPING_THRESHOLD - subtotal)} more for free shipping
                </p>
              )}

              {error && (
                <p style={{ fontFamily: 'Jost, sans-serif', fontSize: 11, color: '#c0392b', marginBottom: 12 }}>{error}</p>
              )}

              <button
                onClick={handleProceed}
                disabled={submitting}
                className="w-full transition-opacity hover:opacity-80"
                style={{
                  fontFamily: 'Jost, sans-serif',
                  fontWeight: 300,
                  fontSize: 11,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: 'var(--white)',
                  background: 'var(--black)',
                  border: 'none',
                  padding: '16px',
                  cursor: 'pointer',
                  opacity: submitting ? 0.6 : 1,
                }}
              >
                {submitting ? 'Processing…' : session ? 'Proceed to Pay' : 'Sign In to Checkout'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
