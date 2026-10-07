'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers/AuthProvider'
import { useCart } from '@/lib/cart'
import Script from 'next/script'
import Link from 'next/link'
// Pricing rules live in ONE shared file so the cart, checkout and
// payment server can never disagree about the total.
import { STORE_POLICY } from '@/lib/store-policy'
import { computeTotals, SHIPPING_THRESHOLD, SHIPPING_COST, GST_RATE } from '@/lib/pricing'

function formatPrice(paise) {
  return `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function CheckoutPage() {
  const router = useRouter()
  const { items, refresh, loading: cartLoading } = useCart()
  const { session, user, loading } = useAuth()
  const status = loading ? 'loading' : session ? 'authenticated' : 'unauthenticated'

  // Checkout layout states
  const [activeStep, setActiveStep] = useState(2) // 1: Email, 2: Shipping, 3: Payment
  const emailCompleted = Boolean(session)
  const checkoutKey = useRef(null)
  const [shippingCompleted, setShippingCompleted] = useState(false)

  const email = user?.email || ''

  // Step 2: Shipping states
  const [addresses, setAddresses] = useState([])
  const [selectedAddressId, setSelectedAddressId] = useState(null)
  const [showNewAddressForm, setShowNewAddressForm] = useState(true)

  // Address form inputs
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [line1, setLine1] = useState('')
  const [line2, setLine2] = useState('')
  const [zipCode, setZipCode] = useState('')
  const [area, setArea] = useState('')
  const [city, setCity] = useState('')
  const [district, setDistrict] = useState('')
  const [postOffices, setPostOffices] = useState([])
  const [stateName, setStateName] = useState('')
  const [pincodeLoading, setPincodeLoading] = useState(false)
  const [zipError, setZipError] = useState('')
  const [addressSaving, setAddressSaving] = useState(false)

  // Step 3: Payment states
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [checkoutData, setCheckoutData] = useState(null) // Razorpay order object from backend
  const [sdkReady, setSdkReady] = useState(false)
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [paymentError, setPaymentError] = useState('')

  // Redirect if cart is empty
  useEffect(() => {
    if (status !== 'loading' && !cartLoading && items.length === 0 && !checkoutData) {
      router.replace('/cart')
    }
  }, [items, status, cartLoading, router, checkoutData])

  // Sync auth state
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      // Fetch user's saved addresses
      fetch('/api/addresses')
        .then(r => r.json())
        .then(data => {
          setAddresses(data)
          const def = data.find(a => a.isDefault) || data[0]
          if (def) {
            setSelectedAddressId(def.id)
            setShowNewAddressForm(false)
            // Pre-fill form fields in case they want to review
            const names = def.fullName.split(' ')
            setFirstName(names[0] || '')
            setLastName(names.slice(1).join(' ') || '')
            setPhone(def.phone)
            setLine1(def.line1)
            setLine2(def.line2 || '')
            setZipCode(def.pincode)
            setArea(def.area || '')
            setCity(def.city)
            setDistrict(def.district || '')
            setStateName(def.state)
          }
        })
        .catch(() => setPaymentError("Could not load saved addresses. You can enter your address below."))
    }
  }, [session, status])

  // PIN code lookup
  async function handleZipCodeChange(value) {
    const formatted = value.replace(/\D/g, '')
    setZipCode(formatted)
    setZipError('')

    if (formatted.length === 6) {
      setPincodeLoading(true)
      try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${formatted}`)
        const data = await res.json()
        if (data[0]?.Status === 'Success') {
          const offices = data[0].PostOffice
          // ponytail: town = first head/sub post office for this PIN; postal data has no clean "city" field, so the customer can edit it
          const town = offices.find(o => o.BranchType !== 'Branch Post Office')?.Name.replace(/\s*\(.*\)$/, '')
          setPostOffices(offices.map(o => o.Name))
          setCity(town || offices[0].District)
          setDistrict(offices[0].District)
          setStateName(offices[0].State)
        } else {
          setZipError('Enter a valid 6-digit PIN code, e.g. 638052')
        }
      } catch {
        setZipError('Could not look up this PIN code. Please enter your city and state.')
      } finally {
        setPincodeLoading(false)
      }
    }
  }

  // Step 2: Shipping submit
  async function handleShippingContinue(e) {
    e.preventDefault()
    setPaymentError('')

    if (checkoutData) { checkoutKey.current = null; setCheckoutData(null) }
    let targetAddressId = selectedAddressId

    if (showNewAddressForm) {
      // Validate
      if (!firstName || !lastName || !phone || !line1 || !line2 || !area || !zipCode || !city || !district || !stateName) {
        setPaymentError('Please fill out all required fields.')
        return
      }
      const mobile = normalizeIndianMobile(phone)
      if (!mobile) {
        setPaymentError('Enter a valid 10-digit Indian mobile number, e.g. 9876543210.')
        return
      }
      if (!/^[1-9]\d{5}$/.test(zipCode)) {
        setZipError('Enter a valid 6-digit PIN code, e.g. 638052')
        return
      }

      setAddressSaving(true)
      try {
        const full = `${firstName} ${lastName}`
        const res = await fetch('/api/addresses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fullName: full,
            phone: mobile,
            line1,
            line2,
            area,
            pincode: zipCode,
            district,
            city,
            state: stateName,
            isDefault: addresses.length === 0,
          }),
        })

        const savedAddress = await res.json()
        if (!res.ok) {
          setPaymentError(savedAddress.error || 'Failed to save shipping address.')
          setAddressSaving(false)
          return
        }

        setAddresses(prev => [...prev, savedAddress])
        targetAddressId = savedAddress.id
        setSelectedAddressId(savedAddress.id)
        setShowNewAddressForm(false)
      } catch {
        setPaymentError('Network error while saving address.')
        setAddressSaving(false)
        return
      } finally {
        setAddressSaving(false)
      }
    }

    if (!targetAddressId) {
      setPaymentError('Please select or add a shipping address.')
      return
    }

    // Call API to create Razorpay Order.
    // If the customer applied a coupon on the cart page, its code is
    // waiting in sessionStorage — send it so the SERVER computes the
    // discounted amount (we never trust browser math for money).
    const savedCouponCode = sessionStorage.getItem('biahama_coupon') || null

    setAddressSaving(true)
    try {
      const orderRes = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          addressId: targetAddressId,
          checkoutKey: checkoutKey.current ||= crypto.randomUUID(),
          ...(savedCouponCode ? { couponCode: savedCouponCode } : {}),
        }),
      })

      const orderData = await orderRes.json()
      if (!orderRes.ok) {
        if (orderRes.status === 409) checkoutKey.current = null
        setPaymentError(orderData.error || 'Could not initiate payment order.')
        return
      }

      // orderData carries the server-verified discount and couponCode,
      // which the summary panel and the verify step both use.
      if (orderData.completedOrderId) { await refresh(); router.push(`/orders/${orderData.completedOrderId}`); return }
      setCheckoutData({ ...orderData, addressId: targetAddressId })
      setShippingCompleted(true)
      setActiveStep(3)
    } catch {
      setPaymentError('Failed to create checkout order.')
    } finally {
      setAddressSaving(false)
    }
  }

  // Step 3: Payment methods
  async function handlePayOnline() {
    if (!termsAccepted) {
      setPaymentError('Please accept the Terms and Conditions of sale.')
      return
    }
    if (!sdkReady || !checkoutData) {
      setPaymentError('Razorpay payment gateway is not loaded yet.')
      return
    }

    setPaymentLoading(true)
    setPaymentError('')

    const options = {
      key:         checkoutData.keyId,
      amount:      checkoutData.amount,
      currency:    checkoutData.currency,
      order_id:    checkoutData.orderId,
      name:        'Biahama',
      description: 'Luxury Linen',
      prefill:     checkoutData.prefill,
      theme:       { color: '#1a1814' },
      modal: {
        ondismiss: () => setPaymentLoading(false),
      },
      handler: async (response) => {
        try {
          const res = await fetch('/api/payments/verify', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              checkoutId: checkoutData.checkoutId,
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature:  response.razorpay_signature,
              addressId:           checkoutData.addressId,
              paymentMethod:       'razorpay',
              // Same coupon the payment amount was built with —
              // the server re-checks it before creating the order.
              ...(checkoutData.couponCode ? { couponCode: checkoutData.couponCode } : {}),
            }),
          })

          const data = await res.json()
          if (!res.ok) {
            setPaymentError(data.error || 'Payment verification failed.');
            setPaymentLoading(false);
            return
          }

          // Order placed — the coupon is used up, so forget it.
          sessionStorage.removeItem('biahama_coupon')
          await refresh()
          router.push(`/orders/${data.orderId}`)
        } catch {
          setPaymentError('Payment verification failed. Please contact support.')
          setPaymentLoading(false)
        }
      },
    }

    const rzp = new window.Razorpay(options)
    rzp.open()
  }

  // Calculations — prices are GST-inclusive. Same order as the
  // payment server: the coupon discount (the SERVER's number, from
  // the create-order response) comes off the subtotal FIRST, then
  // shipping is decided on the reduced amount.
  const summaryItems = checkoutData?.items || items
  const { subtotal } = computeTotals(summaryItems)
  const discount = Math.min(checkoutData?.discount || 0, subtotal)
  const discountedSubtotal = subtotal - discount
  const shipping = checkoutData?.shipping ?? (discountedSubtotal >= SHIPPING_THRESHOLD || items.length === 0 ? 0 : SHIPPING_COST)
  // GST is already INSIDE the prices — shown for information only.
  const gstIncluded = Math.round(discountedSubtotal - discountedSubtotal / (1 + GST_RATE))
  const total = checkoutData?.amount ?? discountedSubtotal + shipping

  if (loading || cartLoading) return <p className="purchase-page" role="status">Loading your checkout…</p>
  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        onReady={() => setSdkReady(true)}
      />

      <div className="purchase-page" style={{ background: '#ffffff', minHeight: '100vh' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

          {/* Header Spacer */}
          <div style={{ height: 16 }} />

          {/* Main Content Layout */}
          <div
            className="purchase-columns"
            style={{ display: 'flex', flexWrap: 'wrap', width: '100%' }}
          >

            {/* Left Column — Accordion Checkout Steps */}
            <div style={{ flex: '1 1 58%', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>

              <section className="checkout-account" aria-label="Your account">
                <p>1. Your account</p>
                <p>{email}</p>
              </section>

              {/* ================= STEP 2: SHIPPING AND INFORMATION ================= */}
              <div style={{ border: '1px solid var(--border)' }}>
                {/* Banner Header */}
                <div
                  onClick={() => emailCompleted && shippingCompleted && setActiveStep(2)}
                  style={{
                    background: activeStep === 2 ? 'var(--black)' : '#faf9f6',
                    color: activeStep === 2 ? '#ffffff' : 'var(--black)',
                    padding: '16px 24px',
                    fontFamily: 'var(--font-ui)',
                    fontSize: 12,
                    fontWeight: 400,
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                    cursor: emailCompleted ? 'pointer' : 'default',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <span>2. Shipping and Information</span>
                  {shippingCompleted && activeStep !== 2 && (
                    <span style={{ fontSize: 11, textTransform: 'none', letterSpacing: 'normal', color: 'var(--gray)' }}>
                      {checkoutData?.shippingAddress?.fullName} &middot; {checkoutData?.shippingAddress?.city} {checkoutData?.shippingAddress?.pincode}
                    </span>
                  )}
                </div>

                {/* Content */}
                {activeStep === 2 && emailCompleted && (
                  <div style={{ padding: '24px 28px', background: '#ffffff' }}>
                    <p style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 16px 0' }}>
                      {STORE_POLICY.shipping}
                    </p>

                    {/* Shipping Option Card */}
                    <div style={{
                      border: '1px solid var(--black)',
                      padding: '12px 18px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      width: 'fit-content',
                      marginBottom: 32,
                      background: '#faf9f6'
                    }}>
                      <div style={{ width: 12, height: 12, border: '4px solid var(--black)', borderRadius: '50%' }} />
                      <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--black)', fontWeight: 400 }}>
                        {shipping === 0 ? 'Free shipping' : `Standard shipping · ${formatPrice(shipping)}`}
                      </span>
                    </div>

                    <h3 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 20, fontWeight: 300, color: 'var(--black)', margin: '0 0 8px 0' }}>
                      Where do you want your order to be shipped?
                    </h3>

                    {/* Regional India Notice */}
                    <p style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#a0522d', lineHeight: 1.6, margin: '0 0 24px 0' }}>
                      We currently ship within India only.
                    </p>

                    {/* Saved Addresses Picker */}
                    {addresses.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
                        <span style={{ fontFamily: 'var(--font-ui)', fontSize: 10, textTransform: 'uppercase', color: 'var(--gray)', letterSpacing: '0.1em' }}>
                          Choose a saved address:
                        </span>
                        {addresses.map(addr => (
                          <label
                            key={addr.id}
                            style={{
                              display: 'flex',
                              gap: 12,
                              padding: 16,
                              border: selectedAddressId === addr.id && !showNewAddressForm ? '1px solid var(--black)' : '1px solid var(--border)',
                              background: '#ffffff',
                              cursor: 'pointer',
                            }}
                          >
                            <input
                              type="radio"
                              name="shipping_address"
                              checked={selectedAddressId === addr.id && !showNewAddressForm}
                              onChange={() => {
                                setSelectedAddressId(addr.id)
                                setShowNewAddressForm(false)
                                // Pre-fill address fields
                                const names = addr.fullName.split(' ')
                                setFirstName(names[0] || '')
                                setLastName(names.slice(1).join(' ') || '')
                                setPhone(addr.phone)
                                setLine1(addr.line1)
                                setLine2(addr.line2 || '')
                                setZipCode(addr.pincode)
                                setArea(addr.area || '')
                                setCity(addr.city)
                                setDistrict(addr.district || '')
                                setStateName(addr.state)
                              }}
                              style={{ marginTop: 2, accentColor: 'var(--black)' }}
                            />
                            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12 }}>
                              <p style={{ margin: '0 0 4px 0', fontWeight: 500 }}>{addr.fullName}</p>
                              <p style={{ margin: 0, color: 'var(--gray)', lineHeight: 1.5 }}>
                                {[addr.line2, addr.line1, addr.area].filter(Boolean).join(', ')}<br />
                                {[addr.city, addr.district !== addr.city && addr.district, addr.state].filter(Boolean).join(', ')} &mdash; {addr.pincode}
                              </p>
                            </div>
                          </label>
                        ))}

                        {!showNewAddressForm && (
                          <button
                            type="button"
                            onClick={() => {
                              setShowNewAddressForm(true)
                              setSelectedAddressId(null)
                              // Clear inputs for new entry
                              setFirstName('')
                              setLastName('')
                              setPhone('')
                              setLine1('')
                              setLine2('')
                              setZipCode('')
                              setArea('')
                              setCity('')
                              setDistrict('')
                              setStateName('')
                            }}
                            style={{
                              alignSelf: 'flex-start',
                              background: 'none',
                              border: 'none',
                              color: 'var(--black)',
                              textDecoration: 'underline',
                              fontSize: 11,
                              fontFamily: 'var(--font-ui)',
                              cursor: 'pointer',
                              padding: 0
                            }}
                          >
                            + Use a different address
                          </button>
                        )}
                      </div>
                    )}

                    {/* Shipping address form */}
                    {(showNewAddressForm || addresses.length === 0) && (
                      <form onSubmit={handleShippingContinue} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>


                        {/* First and Last Name */}
                        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                          <div style={{ flex: '1 1 45%' }}>
                            <label style={{ fontFamily: 'var(--font-ui)', fontSize: 10, textTransform: 'uppercase', color: 'var(--gray)', letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>
                              First Name *
                            </label>
                            <input
                              type="text"
                              required
                              value={firstName}
                              onChange={(e) => setFirstName(e.target.value)}
                              style={{ width: '100%', border: '1px solid var(--border)', padding: '10px 12px', fontSize: 12, fontFamily: 'var(--font-ui)', outline: 'none' }}
                            />
                          </div>
                          <div style={{ flex: '1 1 45%' }}>
                            <label style={{ fontFamily: 'var(--font-ui)', fontSize: 10, textTransform: 'uppercase', color: 'var(--gray)', letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>
                              Last Name *
                            </label>
                            <input
                              type="text"
                              required
                              value={lastName}
                              onChange={(e) => setLastName(e.target.value)}
                              style={{ width: '100%', border: '1px solid var(--border)', padding: '10px 12px', fontSize: 12, fontFamily: 'var(--font-ui)', outline: 'none' }}
                            />
                          </div>
                        </div>

                        {/* Phone */}
                        <div>
                          <label style={{ fontFamily: 'var(--font-ui)', fontSize: 10, textTransform: 'uppercase', color: 'var(--gray)', letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>
                            Phone *
                          </label>
                          <input
                            type="tel"
                            inputMode="numeric"
                            autoComplete="tel-national"
                            placeholder="10-digit mobile number"
                            required
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            style={{ width: '100%', border: '1px solid var(--border)', padding: '10px 12px', fontSize: 12, fontFamily: 'var(--font-ui)', outline: 'none' }}
                          />
                        </div>

                        <div>
                          <label style={FIELD_LABEL}>Street *</label>
                          <input
                            type="text"
                            required
                            value={line1}
                            onChange={(e) => setLine1(e.target.value)}
                            placeholder="e.g. Pethamapalayam Road"
                            style={FIELD_INPUT}
                          />
                        </div>

                        <div>
                          <label style={FIELD_LABEL}>House / Flat No. *</label>
                          <input
                            type="text"
                            required
                            value={line2}
                            onChange={(e) => setLine2(e.target.value)}
                            placeholder="e.g. 514/3/1"
                            style={FIELD_INPUT}
                          />
                        </div>

                        <div>
                          <label style={FIELD_LABEL}>Area / Locality *</label>
                          <input
                            type="text"
                            required
                            value={area}
                            onChange={(e) => setArea(e.target.value)}
                            placeholder="Village, locality or landmark"
                            list="area-options"
                            style={FIELD_INPUT}
                          />
                        </div>

                        {/* PIN code */}
                        <div>
                          <label style={{ fontFamily: 'var(--font-ui)', fontSize: 10, textTransform: 'uppercase', color: 'var(--gray)', letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>
                            PIN Code *
                          </label>
                          <input
                            type="text"
                            required
                            inputMode="numeric"
                            autoComplete="postal-code"
                            maxLength={6}
                            value={zipCode}
                            onChange={(e) => handleZipCodeChange(e.target.value)}
                            style={{ width: '100%', border: '1px solid var(--border)', padding: '10px 12px', fontSize: 12, fontFamily: 'var(--font-ui)', outline: 'none' }}
                          />
                          {pincodeLoading && (
                            <p style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--gray)', margin: '4px 0 0 0' }}>Looking up PIN code details…</p>
                          )}
                          {zipError && (
                            <p style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: '#cc0000', margin: '4px 0 0 0', lineHeight: 1.4 }}>{zipError}</p>
                          )}
                        </div>

                        <div>
                          <label style={FIELD_LABEL}>City / Town *</label>
                          <input
                            type="text"
                            required
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            list="city-options"
                            style={FIELD_INPUT}
                          />
                        </div>

                        <div>
                          <label style={FIELD_LABEL}>District *</label>
                          <input
                            type="text"
                            required
                            value={district}
                            onChange={(e) => setDistrict(e.target.value)}
                            style={FIELD_INPUT}
                          />
                        </div>

                        <div>
                          <label style={FIELD_LABEL}>State *</label>
                          <input
                            type="text"
                            required
                            value={stateName}
                            onChange={(e) => setStateName(e.target.value)}
                            style={FIELD_INPUT}
                          />
                        </div>

                        <datalist id="area-options">{postOffices.map(n => <option key={n} value={n} />)}</datalist>
                        <datalist id="city-options">{[...new Set([city, district].filter(Boolean))].map(n => <option key={n} value={n} />)}</datalist>

                        <button
                          type="submit"
                          disabled={addressSaving}
                          style={{
                            background: 'var(--black)',
                            color: '#ffffff',
                            border: 'none',
                            padding: '14px',
                            fontSize: 11,
                            fontFamily: 'var(--font-ui)',
                            letterSpacing: '0.15em',
                            textTransform: 'uppercase',
                            cursor: 'pointer',
                            marginTop: 12
                          }}
                        >
                          {addressSaving ? 'Saving…' : 'CONTINUE'}
                        </button>
                      </form>
                    )}

                    {/* Preselected saved address submit */}
                    {!showNewAddressForm && selectedAddressId && (
                      <button
                        onClick={handleShippingContinue}
                        disabled={addressSaving}
                        style={{
                          width: '100%',
                          background: 'var(--black)',
                          color: '#ffffff',
                          border: 'none',
                          padding: '14px',
                          fontSize: 11,
                          fontFamily: 'var(--font-ui)',
                          letterSpacing: '0.15em',
                          textTransform: 'uppercase',
                          cursor: 'pointer',
                          marginTop: 24
                        }}
                      >
                        {addressSaving ? 'Saving…' : 'CONTINUE WITH SELECTED ADDRESS'}
                      </button>
                    )}

                  </div>
                )}
              </div>

              {/* ================= STEP 3: PAYMENT ================= */}
              <div style={{ border: '1px solid var(--border)' }}>
                {/* Banner Header */}
                <div
                  style={{
                    background: activeStep === 3 ? 'var(--black)' : '#faf9f6',
                    color: activeStep === 3 ? '#ffffff' : 'var(--black)',
                    padding: '16px 24px',
                    fontFamily: 'var(--font-ui)',
                    fontSize: 12,
                    fontWeight: 400,
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                  }}
                >
                  <span>3. Payment</span>
                </div>

                {/* Content */}
                {activeStep === 3 && shippingCompleted && emailCompleted && (
                  <div style={{ padding: '24px 28px', background: '#ffffff' }}>

                    {paymentError && (
                      <div style={{ padding: '12px 16px', background: '#fff0f0', border: '1px solid #ffcccc', color: '#cc0000', fontSize: 12, marginBottom: 20 }}>
                        {paymentError}
                      </div>
                    )}

                    {/* Terms & Conditions Checkbox */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 32 }}>
                      <input
                        type="checkbox"
                        id="terms"
                        checked={termsAccepted}
                        onChange={(e) => setTermsAccepted(e.target.checked)}
                        style={{ marginTop: 3, accentColor: 'var(--black)' }}
                      />
                      <label htmlFor="terms" style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--black)', cursor: 'pointer', lineHeight: 1.5 }}>
                        *By confirming the order you accept the Biahama <Link href="/terms" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline', color: 'var(--black)' }}>Terms and Conditions</Link> of sale
                      </label>
                    </div>

                    {/* Single-click Razorpay button, as in the spec (page 5) */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {/* Pay Online Button */}
                      <button
                        onClick={handlePayOnline}
                        disabled={paymentLoading || !sdkReady}
                        style={{
                          width: '100%',
                          padding: '16px 24px',
                          background: 'var(--black)',
                          color: '#ffffff',
                          border: 'none',
                          cursor: (paymentLoading || !sdkReady) ? 'not-allowed' : 'pointer',
                          fontSize: 11,
                          letterSpacing: '0.15em',
                          textTransform: 'uppercase',
                          opacity: (paymentLoading || !sdkReady) ? 0.6 : 1,
                          transition: 'opacity 0.2s',
                          fontFamily: 'var(--font-ui)',
                        }}
                      >
                        {paymentLoading ? 'Processing…' : !sdkReady ? 'Loading Gateway…' : 'Pay Online (Razorpay)'}
                      </button>

                    </div>

                    <p style={{
                      fontSize: 10,
                      color: 'var(--gray)',
                      letterSpacing: '0.04em',
                      marginTop: 24,
                      lineHeight: 1.6,
                      fontFamily: 'var(--font-ui)'
                    }}>
                      Payments secured by Razorpay. Your items are reserved for 30 minutes.
                    </p>

                  </div>
                )}
              </div>

            </div>

            {/* Right Column — Sticky Order Summary */}
            <div style={{ flex: '1 1 32%', minWidth: 0 }}>
              <div style={{
                background: '#faf9f6',
                padding: '32px 28px',
                border: '1px solid var(--border)',
                position: 'sticky',
                top: '88px',
              }}>
                <h2 style={{
                  fontFamily: 'Cormorant Garamond, serif',
                  fontSize: 20,
                  fontWeight: 300,
                  color: 'var(--black)',
                  marginTop: 0,
                  marginBottom: 24,
                  borderBottom: '1px solid var(--border)',
                  paddingBottom: 12,
                }}>
                  Your checkout ({summaryItems.length} {summaryItems.length === 1 ? 'item' : 'items'})
                </h2>

                {/* Itemized List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
                  {summaryItems.map(item => {
                    const imgUrl = item.variant?.images?.[0]?.url || item.variant?.product?.images?.[0]?.url || null
                    return (
                      <div key={item.variantId} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                        <div style={{ width: 50, height: 63, background: 'var(--light)', flexShrink: 0, overflow: 'hidden' }}>
                          {imgUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={imgUrl} alt={item.variant?.product?.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          )}
                        </div>
                        <div style={{ flex: 1, fontFamily: 'var(--font-ui)', fontSize: 12 }}>
                          <p style={{ margin: '0 0 2px 0', color: 'var(--black)', fontWeight: 400 }}>
                            {item.variant?.product?.name}
                          </p>
                          <p style={{ margin: '0 0 2px 0', color: 'var(--gray)', fontSize: 10 }}>
                            Size: {item.variant?.size} &middot; Color: {item.variant?.color} &middot; Qty: {item.quantity}
                          </p>
                          {item.variant?.sku && (
                            <p style={{ margin: 0, color: 'var(--gray)', fontSize: 9, textTransform: 'uppercase' }}>
                              SKU: {item.variant.sku}
                            </p>
                          )}
                        </div>
                        <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 400, color: 'var(--black)', marginLeft: 'auto' }}>
                          {formatPrice(item.variant?.price * item.quantity)}
                        </span>
                      </div>
                    )
                  })}
                </div>

                {/* Subtotal */}
                <div style={{ display: 'flex', justifyBetween: 'space-between', marginBottom: 12, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                  <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--gray)' }}>SUBTOTAL</span>
                  <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--black)', marginLeft: 'auto' }}>{formatPrice(subtotal)}</span>
                </div>

                {/* Coupon discount line (server-verified number) */}
                {discount > 0 && (
                  <div style={{ display: 'flex', marginBottom: 12 }}>
                    <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#27ae60' }}>
                      Discount{checkoutData?.couponCode ? ` (${checkoutData.couponCode})` : ''}
                    </span>
                    <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#27ae60', marginLeft: 'auto' }}>
                      &minus;{formatPrice(discount)}
                    </span>
                  </div>
                )}

                {/* Shipment */}
                <div style={{ display: 'flex', flexDirection: 'column', borderBottom: '1px solid var(--border)', paddingBottom: 16, marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyBetween: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--gray)' }}>Shipment</span>
                    <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--black)', marginLeft: 'auto' }}>{shipping === 0 ? 'Free' : formatPrice(shipping)}</span>
                  </div>
                  <span style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: 'var(--gray)', fontStyle: 'italic', lineHeight: 1.4 }}>
                    Orders dispatch in 2–4 working days; delivery usually takes another 5–7 working days.
                  </span>
                </div>

                {/* Total — GST is already inside the prices, so it is
                    shown as information only, never added on top */}
                <div style={{ display: 'flex', justifyBetween: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 400, color: 'var(--black)' }}>TOTAL <span style={{ fontSize: 10, color: 'var(--gray)' }}>Includes {formatPrice(gstIncluded)} GST</span></span>
                  <span style={{ fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 500, color: 'var(--black)', marginLeft: 'auto' }}>{formatPrice(total)}</span>
                </div>

              </div>
            </div>

          </div>

        </div>
      </div>
    </>
  )
}

// Accepts "9876543210", "+91 98765 43210", "09876543210"; returns 10 digits or null.
function normalizeIndianMobile(value) {
  const digits = String(value).replace(/\D/g, '').replace(/^(91|0)(?=\d{10}$)/, '')
  return /^[6-9]\d{9}$/.test(digits) ? digits : null
}

const FIELD_LABEL = { fontFamily: 'var(--font-ui)', fontSize: 10, textTransform: 'uppercase', color: 'var(--gray)', letterSpacing: '0.1em', display: 'block', marginBottom: 6 }
const FIELD_INPUT = { width: '100%', border: '1px solid var(--border)', padding: '10px 12px', fontSize: 12, fontFamily: 'var(--font-ui)', outline: 'none' }
