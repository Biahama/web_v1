'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession, signIn } from 'next-auth/react'
import { useCart } from '@/lib/cart'
import Script from 'next/script'
import Link from 'next/link'

const SHIPPING_THRESHOLD = 300000 // ₹3,000 in paise
const SHIPPING_COST      = 9900   // ₹99 in paise
const GST_RATE           = 0.05

function formatPrice(paise) {
  return `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function CheckoutPage() {
  const router = useRouter()
  const { items, clear } = useCart()
  const { data: session, status } = useSession()

  // Checkout layout states
  const [activeStep, setActiveStep] = useState(1) // 1: Email, 2: Shipping, 3: Payment
  const [emailCompleted, setEmailCompleted] = useState(false)
  const [shippingCompleted, setShippingCompleted] = useState(false)

  // Step 1: Email states
  const [email, setEmail] = useState('')
  const [emailChecked, setEmailChecked] = useState(false)
  const [userExists, setUserExists] = useState(false)
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  // Step 2: Shipping states
  const [addresses, setAddresses] = useState([])
  const [selectedAddressId, setSelectedAddressId] = useState(null)
  const [showNewAddressForm, setShowNewAddressForm] = useState(true)

  // Address form inputs
  const [title, setTitle] = useState('Mr.') // Mr., Ms., Miss, Mrs.
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [line1, setLine1] = useState('')
  const [line2, setLine2] = useState('')
  const [zipCode, setZipCode] = useState('')
  const [city, setCity] = useState('')
  const [stateName, setStateName] = useState('')
  const [invoiceSame, setInvoiceSame] = useState(true)
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
    if (status !== 'loading' && items.length === 0) {
      router.replace('/cart')
    }
  }, [items, status])

  // Sync auth state
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      setEmailCompleted(true)
      setEmail(session.user.email)
      if (activeStep === 1) {
        setActiveStep(2)
      }
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
            setCity(def.city)
            setStateName(def.state)
          }
        })
        .catch(() => {})
    }
  }, [session, status])

  // Step 1: Email check & submit
  async function handleEmailContinue(e) {
    e.preventDefault()
    if (!email) return
    setAuthError('')
    setAuthLoading(true)

    try {
      const res = await fetch('/api/auth/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      setUserExists(data.exists)
      setEmailChecked(true)
    } catch {
      setAuthError('Something went wrong. Please try again.')
    } finally {
      setAuthLoading(false)
    }
  }

  async function handleEmailAuth(e) {
    e.preventDefault()
    setAuthError('')
    setAuthLoading(true)

    if (userExists) {
      // Login inline
      const res = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (res?.error) {
        setAuthError('Invalid password. Please try again.')
        setAuthLoading(false)
      } else {
        // Authenticated! session state handles activeStep transition
        setAuthLoading(false)
      }
    } else {
      // Register inline
      if (password.length < 8) {
        setAuthError('Password must be at least 8 characters.')
        setAuthLoading(false)
        return
      }
      if (!fullName) {
        setAuthError('Full name is required.')
        setAuthLoading(false)
        return
      }

      try {
        const signupRes = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: fullName,
            email,
            password,
          }),
        })

        const signupData = await signupRes.json()
        if (!signupRes.ok) {
          setAuthError(signupData.error || 'Failed to register.')
          setAuthLoading(false)
          return
        }

        // Login after register
        const res = await signIn('credentials', {
          email,
          password,
          redirect: false,
        })
        
        if (res?.error) {
          setAuthError('Failed to log in automatically after signup.')
          setAuthLoading(false)
        }
      } catch {
        setAuthError('Failed to sign up. Please try again.')
        setAuthLoading(false)
      }
    }
  }

  // ZIP Code postal lookup
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
          const po = data[0].PostOffice[0]
          setCity(po.District)
          setStateName(po.State)
        } else {
          setZipError('Enter a valid ZIP code in the following sample format: 999999')
        }
      } catch {
        // Silent catch
      } finally {
        setPincodeLoading(false)
      }
    }
  }

  // Step 2: Shipping submit
  async function handleShippingContinue(e) {
    e.preventDefault()
    setPaymentError('')
    
    let targetAddressId = selectedAddressId

    if (showNewAddressForm) {
      // Validate
      if (!firstName || !lastName || !phone || !line1 || !zipCode || !city || !stateName) {
        setPaymentError('Please fill out all required fields.')
        return
      }
      if (zipCode.length !== 6) {
        setZipError('Enter a valid ZIP code in the following sample format: 999999')
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
            phone,
            line1,
            line2,
            pincode: zipCode,
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

    // Call API to create Razorpay Order
    setAddressSaving(true)
    try {
      const orderRes = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addressId: targetAddressId }),
      })

      const orderData = await orderRes.json()
      if (!orderRes.ok) {
        setPaymentError(orderData.error || 'Could not initiate payment order.')
        return
      }

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
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature:  response.razorpay_signature,
              addressId:           checkoutData.addressId,
              paymentMethod:       'razorpay',
            }),
          })

          const data = await res.json()
          if (!res.ok) { 
            setPaymentError(data.error || 'Payment verification failed.'); 
            setPaymentLoading(false); 
            return 
          }

          await clear()
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

  async function handlePayCOD() {
    if (!termsAccepted) {
      setPaymentError('Please accept the Terms and Conditions of sale.')
      return
    }
    if (!checkoutData) return

    setPaymentLoading(true)
    setPaymentError('')

    try {
      const res = await fetch('/api/payments/verify', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          addressId:     checkoutData.addressId,
          paymentMethod: 'cod',
        }),
      })

      const data = await res.json()
      if (!res.ok) { 
        setPaymentError(data.error || 'Failed to place COD order.'); 
        setPaymentLoading(false); 
        return 
      }

      await clear()
      router.push(`/orders/${data.orderId}`)
    } catch {
      setPaymentError('Failed to place order. Please try again.')
      setPaymentLoading(false)
    }
  }

  // Calculations
  const subtotal = items.reduce((s, i) => s + i.variant.price * i.quantity, 0)
  const shipping = subtotal >= SHIPPING_THRESHOLD || items.length === 0 ? 0 : SHIPPING_COST
  const gst = Math.round(subtotal * GST_RATE)
  const total = subtotal + shipping + gst

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        onReady={() => setSdkReady(true)}
      />

      <div style={{ background: '#ffffff', minHeight: '100vh', padding: '40px 48px 100px 48px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          {/* Header Spacer */}
          <div style={{ height: 16 }} />

          {/* Main Content Layout */}
          <div 
            className="flex flex-col lg:flex-row gap-16" 
            style={{ display: 'flex', flexWrap: 'wrap', width: '100%' }}
          >
            
            {/* Left Column — Accordion Checkout Steps */}
            <div style={{ flex: '1 1 58%', minWidth: '320px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              
              {/* ================= STEP 1: EMAIL ADDRESS ================= */}
              <div style={{ border: '1px solid var(--border)' }}>
                {/* Banner Header */}
                <div 
                  onClick={() => emailCompleted && setActiveStep(1)}
                  style={{
                    background: activeStep === 1 ? 'var(--black)' : '#faf9f6',
                    color: activeStep === 1 ? '#ffffff' : 'var(--black)',
                    padding: '16px 24px',
                    fontFamily: 'Jost, sans-serif',
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
                  <span>1. E-mail address</span>
                  {emailCompleted && activeStep !== 1 && (
                    <span style={{ fontSize: 11, textTransform: 'none', letterSpacing: 'normal', color: 'var(--gray)' }}>
                      {email} &nbsp;&middot;&nbsp; Connected
                    </span>
                  )}
                </div>

                {/* Content */}
                {activeStep === 1 && (
                  <div style={{ padding: '24px 28px', background: '#ffffff' }}>
                    <p style={{ fontFamily: 'Jost, sans-serif', fontSize: 13, color: 'var(--gray)', lineHeight: 1.6, margin: '0 0 24px 0' }}>
                      Enter your e-mail address to proceed to checkout. If you are already registered, you will be asked to enter your password.
                    </p>

                    {authError && (
                      <div style={{ padding: '12px 16px', background: '#fff0f0', border: '1px solid #ffcccc', color: '#cc0000', fontSize: 12, marginBottom: 20 }}>
                        {authError}
                      </div>
                    )}

                    {!emailChecked ? (
                      <form onSubmit={handleEmailContinue} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div>
                          <label style={{ fontFamily: 'Jost, sans-serif', fontSize: 10, textTransform: 'uppercase', color: 'var(--gray)', letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>
                            E-mail address *
                          </label>
                          <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            style={{ width: '100%', border: '1px solid var(--border)', padding: '10px 12px', fontSize: 12, fontFamily: 'Jost, sans-serif', outline: 'none' }}
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={authLoading}
                          style={{ background: 'var(--black)', color: '#ffffff', border: 'none', padding: '14px', fontSize: 11, fontFamily: 'Jost, sans-serif', letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer' }}
                        >
                          {authLoading ? 'Checking…' : 'CONTINUE'}
                        </button>
                      </form>
                    ) : (
                      <form onSubmit={handleEmailAuth} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 12, fontFamily: 'Jost, sans-serif', color: 'var(--black)' }}>
                            Email: <strong>{email}</strong>
                          </span>
                          <button 
                            type="button" 
                            onClick={() => setEmailChecked(false)} 
                            style={{ background: 'none', border: 'none', color: 'var(--gray)', textDecoration: 'underline', fontSize: 11, cursor: 'pointer', fontFamily: 'Jost, sans-serif' }}
                          >
                            Change
                          </button>
                        </div>

                        {!userExists && (
                          <div>
                            <label style={{ fontFamily: 'Jost, sans-serif', fontSize: 10, textTransform: 'uppercase', color: 'var(--gray)', letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>
                              Full Name *
                            </label>
                            <input
                              type="text"
                              required
                              value={fullName}
                              onChange={(e) => setFullName(e.target.value)}
                              style={{ width: '100%', border: '1px solid var(--border)', padding: '10px 12px', fontSize: 12, fontFamily: 'Jost, sans-serif', outline: 'none' }}
                            />
                          </div>
                        )}

                        <div>
                          <label style={{ fontFamily: 'Jost, sans-serif', fontSize: 10, textTransform: 'uppercase', color: 'var(--gray)', letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>
                            Password *
                          </label>
                          <input
                            type="password"
                            required
                            placeholder={userExists ? 'Enter password' : 'Min 8 characters'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            style={{ width: '100%', border: '1px solid var(--border)', padding: '10px 12px', fontSize: 12, fontFamily: 'Jost, sans-serif', outline: 'none' }}
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={authLoading}
                          style={{ background: 'var(--black)', color: '#ffffff', border: 'none', padding: '14px', fontSize: 11, fontFamily: 'Jost, sans-serif', letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer' }}
                        >
                          {authLoading ? 'Processing…' : userExists ? 'LOG IN & CONTINUE' : 'CREATE ACCOUNT & CONTINUE'}
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </div>

              {/* ================= STEP 2: SHIPPING AND INFORMATION ================= */}
              <div style={{ border: '1px solid var(--border)' }}>
                {/* Banner Header */}
                <div 
                  onClick={() => emailCompleted && shippingCompleted && setActiveStep(2)}
                  style={{
                    background: activeStep === 2 ? 'var(--black)' : '#faf9f6',
                    color: activeStep === 2 ? '#ffffff' : 'var(--black)',
                    padding: '16px 24px',
                    fontFamily: 'Jost, sans-serif',
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
                      Address Saved &middot; Ready
                    </span>
                  )}
                </div>

                {/* Content */}
                {activeStep === 2 && emailCompleted && (
                  <div style={{ padding: '24px 28px', background: '#ffffff' }}>
                    <p style={{ fontFamily: 'Jost, sans-serif', fontSize: 11, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 16px 0' }}>
                      We offer free shipping on all orders with Express Worldwide service.
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
                      <span style={{ fontFamily: 'Jost, sans-serif', fontSize: 12, color: 'var(--black)', fontWeight: 400 }}>
                        Free
                      </span>
                    </div>

                    <h3 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 20, fontWeight: 300, color: 'var(--black)', margin: '0 0 8px 0' }}>
                      Where do you want your order to be shipped?
                    </h3>

                    {/* Regional India Notice */}
                    <p style={{ fontFamily: 'Jost, sans-serif', fontSize: 12, color: '#a0522d', lineHeight: 1.6, margin: '0 0 24px 0' }}>
                      You are shopping from the <strong>Online Boutique India</strong>. To ensure the correct processing of your order, please verify that your shipping address corresponds to the selected country.
                    </p>

                    {/* Saved Addresses Picker */}
                    {addresses.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
                        <span style={{ fontFamily: 'Jost, sans-serif', fontSize: 10, textTransform: 'uppercase', color: 'var(--gray)', letterSpacing: '0.1em' }}>
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
                                setCity(addr.city)
                                setStateName(addr.state)
                              }}
                              style={{ marginTop: 2, accentColor: 'var(--black)' }}
                            />
                            <div style={{ fontFamily: 'Jost, sans-serif', fontSize: 12 }}>
                              <p style={{ margin: '0 0 4px 0', fontWeight: 500 }}>{addr.fullName}</p>
                              <p style={{ margin: 0, color: 'var(--gray)', lineHeight: 1.5 }}>
                                {addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}<br />
                                {addr.city}, {addr.state} &mdash; {addr.pincode}
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
                              setCity('')
                              setStateName('')
                            }}
                            style={{
                              alignSelf: 'flex-start',
                              background: 'none',
                              border: 'none',
                              color: 'var(--black)',
                              textDecoration: 'underline',
                              fontSize: 11,
                              fontFamily: 'Jost, sans-serif',
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
                        
                        {/* Title Radio Selection */}
                        <div>
                          <span style={{ fontFamily: 'Jost, sans-serif', fontSize: 10, textTransform: 'uppercase', color: 'var(--gray)', letterSpacing: '0.1em', display: 'block', marginBottom: 8 }}>
                            Title *
                          </span>
                          <div style={{ display: 'flex', gap: 20 }}>
                            {['Mr.', 'Ms.', 'Miss', 'Mrs.'].map(opt => (
                              <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'Jost, sans-serif', fontSize: 12, cursor: 'pointer' }}>
                                <input
                                  type="radio"
                                  name="title"
                                  value={opt}
                                  checked={title === opt}
                                  onChange={(e) => setTitle(e.target.value)}
                                  style={{ accentColor: 'var(--black)' }}
                                />
                                {opt}
                              </label>
                            ))}
                          </div>
                        </div>

                        {/* First and Last Name */}
                        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                          <div style={{ flex: '1 1 45%' }}>
                            <label style={{ fontFamily: 'Jost, sans-serif', fontSize: 10, textTransform: 'uppercase', color: 'var(--gray)', letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>
                              First Name *
                            </label>
                            <input
                              type="text"
                              required
                              value={firstName}
                              onChange={(e) => setFirstName(e.target.value)}
                              style={{ width: '100%', border: '1px solid var(--border)', padding: '10px 12px', fontSize: 12, fontFamily: 'Jost, sans-serif', outline: 'none' }}
                            />
                          </div>
                          <div style={{ flex: '1 1 45%' }}>
                            <label style={{ fontFamily: 'Jost, sans-serif', fontSize: 10, textTransform: 'uppercase', color: 'var(--gray)', letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>
                              Last Name *
                            </label>
                            <input
                              type="text"
                              required
                              value={lastName}
                              onChange={(e) => setLastName(e.target.value)}
                              style={{ width: '100%', border: '1px solid var(--border)', padding: '10px 12px', fontSize: 12, fontFamily: 'Jost, sans-serif', outline: 'none' }}
                            />
                          </div>
                        </div>

                        {/* Phone */}
                        <div>
                          <label style={{ fontFamily: 'Jost, sans-serif', fontSize: 10, textTransform: 'uppercase', color: 'var(--gray)', letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>
                            Phone *
                          </label>
                          <input
                            type="tel"
                            required
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            style={{ width: '100%', border: '1px solid var(--border)', padding: '10px 12px', fontSize: 12, fontFamily: 'Jost, sans-serif', outline: 'none' }}
                          />
                        </div>

                        {/* Address Lines */}
                        <div>
                          <label style={{ fontFamily: 'Jost, sans-serif', fontSize: 10, textTransform: 'uppercase', color: 'var(--gray)', letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>
                            Address *
                          </label>
                          <input
                            type="text"
                            required
                            value={line1}
                            onChange={(e) => setLine1(e.target.value)}
                            placeholder="Street address, apartment, suite, unit etc."
                            style={{ width: '100%', border: '1px solid var(--border)', padding: '10px 12px', fontSize: 12, fontFamily: 'Jost, sans-serif', outline: 'none', marginBottom: 10 }}
                          />
                          <input
                            type="text"
                            value={line2}
                            onChange={(e) => setLine2(e.target.value)}
                            placeholder="Apartment, suite, unit etc. (optional)"
                            style={{ width: '100%', border: '1px solid var(--border)', padding: '10px 12px', fontSize: 12, fontFamily: 'Jost, sans-serif', outline: 'none' }}
                          />
                        </div>

                        {/* ZIP Code / Pincode */}
                        <div>
                          <label style={{ fontFamily: 'Jost, sans-serif', fontSize: 10, textTransform: 'uppercase', color: 'var(--gray)', letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>
                            ZIP Code *
                          </label>
                          <input
                            type="text"
                            required
                            maxLength={6}
                            value={zipCode}
                            onChange={(e) => handleZipCodeChange(e.target.value)}
                            style={{ width: '100%', border: '1px solid var(--border)', padding: '10px 12px', fontSize: 12, fontFamily: 'Jost, sans-serif', outline: 'none' }}
                          />
                          {pincodeLoading && (
                            <p style={{ fontFamily: 'Jost, sans-serif', fontSize: 11, color: 'var(--gray)', margin: '4px 0 0 0' }}>Looking up PIN code details…</p>
                          )}
                          {zipError && (
                            <p style={{ fontFamily: 'Jost, sans-serif', fontSize: 11, color: '#cc0000', margin: '4px 0 0 0', lineHeight: 1.4 }}>{zipError}</p>
                          )}
                        </div>

                        {/* City & State (Auto-populated or filled) */}
                        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                          <div style={{ flex: '1 1 45%' }}>
                            <label style={{ fontFamily: 'Jost, sans-serif', fontSize: 10, textTransform: 'uppercase', color: 'var(--gray)', letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>
                              City *
                            </label>
                            <input
                              type="text"
                              required
                              value={city}
                              onChange={(e) => setCity(e.target.value)}
                              style={{ width: '100%', border: '1px solid var(--border)', padding: '10px 12px', fontSize: 12, fontFamily: 'Jost, sans-serif', outline: 'none', background: city ? '#faf9f6' : '#ffffff' }}
                            />
                          </div>
                          <div style={{ flex: '1 1 45%' }}>
                            <label style={{ fontFamily: 'Jost, sans-serif', fontSize: 10, textTransform: 'uppercase', color: 'var(--gray)', letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>
                              State *
                            </label>
                            <input
                              type="text"
                              required
                              value={stateName}
                              onChange={(e) => setStateName(e.target.value)}
                              style={{ width: '100%', border: '1px solid var(--border)', padding: '10px 12px', fontSize: 12, fontFamily: 'Jost, sans-serif', outline: 'none', background: stateName ? '#faf9f6' : '#ffffff' }}
                            />
                          </div>
                        </div>

                        {/* Invoice Address Checkbox */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                          <input
                            type="checkbox"
                            id="invoice_same"
                            checked={invoiceSame}
                            onChange={(e) => setInvoiceSame(e.target.checked)}
                            style={{ accentColor: 'var(--black)' }}
                          />
                          <label htmlFor="invoice_same" style={{ fontFamily: 'Jost, sans-serif', fontSize: 12, color: 'var(--black)', cursor: 'pointer' }}>
                            The delivery address is the same as the invoice address
                          </label>
                        </div>

                        <button
                          type="submit"
                          disabled={addressSaving}
                          style={{ 
                            background: 'var(--black)', 
                            color: '#ffffff', 
                            border: 'none', 
                            padding: '14px', 
                            fontSize: 11, 
                            fontFamily: 'Jost, sans-serif', 
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
                          fontFamily: 'Jost, sans-serif', 
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
                    fontFamily: 'Jost, sans-serif',
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
                      <label htmlFor="terms" style={{ fontFamily: 'Jost, sans-serif', fontSize: 12, color: 'var(--black)', cursor: 'pointer', lineHeight: 1.5 }}>
                        *By confirming the order you accept the Biahama <a href="/terms" target="_blank" style={{ textDecoration: 'underline', color: 'var(--black)' }}>Terms and Conditions</a> of sale
                      </label>
                    </div>

                    {/* Single click buttons as requested in mockup Page 5 */}
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
                          fontFamily: 'Jost, sans-serif',
                        }}
                      >
                        {paymentLoading ? 'Processing…' : !sdkReady ? 'Loading Gateway…' : 'Pay Online (Razorpay)'}
                      </button>

                      {/* Cash on Delivery Button */}
                      <button
                        onClick={handlePayCOD}
                        disabled={paymentLoading}
                        style={{
                          width: '100%',
                          padding: '16px 24px',
                          background: 'transparent',
                          color: 'var(--black)',
                          border: '1px solid var(--border)',
                          cursor: paymentLoading ? 'not-allowed' : 'pointer',
                          fontSize: 11,
                          letterSpacing: '0.15em',
                          textTransform: 'uppercase',
                          opacity: paymentLoading ? 0.6 : 1,
                          transition: 'opacity 0.2s',
                          fontFamily: 'Jost, sans-serif',
                        }}
                      >
                        Cash on Delivery (COD)
                      </button>
                    </div>

                    <p style={{
                      fontSize: 10,
                      color: 'var(--gray)',
                      letterSpacing: '0.04em',
                      marginTop: 24,
                      lineHeight: 1.6,
                      fontFamily: 'Jost, sans-serif'
                    }}>
                      Payments secured by Razorpay. COD orders may have an additional verification call before shipment.
                    </p>

                  </div>
                )}
              </div>

            </div>

            {/* Right Column — Sticky Order Summary */}
            <div style={{ flex: '1 1 32%', minWidth: '300px' }}>
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
                  Your cart ({items.length} {items.length === 1 ? 'item' : 'items'})
                </h2>

                {/* Itemized List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
                  {items.map(item => {
                    const imgUrl = item.variant?.images?.[0]?.url || item.variant?.product?.image || null
                    return (
                      <div key={item.variantId} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                        <div style={{ width: 50, height: 63, background: 'var(--light)', flexShrink: 0, overflow: 'hidden' }}>
                          {imgUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={imgUrl} alt={item.variant?.product?.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          )}
                        </div>
                        <div style={{ flex: 1, fontFamily: 'Jost, sans-serif', fontSize: 12 }}>
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
                        <span style={{ fontFamily: 'Jost, sans-serif', fontSize: 12, fontWeight: 400, color: 'var(--black)', marginLeft: 'auto' }}>
                          {formatPrice(item.variant?.price * item.quantity)}
                        </span>
                      </div>
                    )
                  })}
                </div>

                {/* Subtotal */}
                <div style={{ display: 'flex', justifyBetween: 'space-between', marginBottom: 12, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                  <span style={{ fontFamily: 'Jost, sans-serif', fontSize: 12, color: 'var(--gray)' }}>SUBTOTAL</span>
                  <span style={{ fontFamily: 'Jost, sans-serif', fontSize: 12, color: 'var(--black)', marginLeft: 'auto' }}>{formatPrice(subtotal)}</span>
                </div>

                {/* Shipment */}
                <div style={{ display: 'flex', flexDirection: 'column', borderBottom: '1px solid var(--border)', paddingBottom: 16, marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyBetween: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontFamily: 'Jost, sans-serif', fontSize: 12, color: 'var(--gray)' }}>Shipment</span>
                    <span style={{ fontFamily: 'Jost, sans-serif', fontSize: 12, color: 'var(--black)', marginLeft: 'auto' }}>{shipping === 0 ? 'Free' : formatPrice(shipping)}</span>
                  </div>
                  <span style={{ fontFamily: 'Jost, sans-serif', fontSize: 10, color: 'var(--gray)', fontStyle: 'italic', lineHeight: 1.4 }}>
                    2 to 5 working days after receipt of order confirmation
                  </span>
                </div>

                {/* Total */}
                <div style={{ display: 'flex', justifyBetween: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontFamily: 'Jost, sans-serif', fontSize: 13, fontWeight: 400, color: 'var(--black)' }}>TOTAL <span style={{ fontSize: 10, color: 'var(--gray)' }}>Taxes inc.</span></span>
                  <span style={{ fontFamily: 'Jost, sans-serif', fontSize: 14, fontWeight: 500, color: 'var(--black)', marginLeft: 'auto' }}>{formatPrice(total)}</span>
                </div>

              </div>
            </div>

          </div>

        </div>
      </div>
    </>
  )
}
