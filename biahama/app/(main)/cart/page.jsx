'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useCart } from '@/lib/cart'
import ProductCard from '@/components/ui/ProductCard'

const SHIPPING_THRESHOLD = 300000 // ₹3,000 in paise
const SHIPPING_COST      = 9900   // ₹99 in paise
const GST_RATE           = 0.05

function formatPrice(paise) {
  return `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function CartPage() {
  const { items, remove, updateQty } = useCart()
  const router = useRouter()

  // Recommended products state
  const [recommendations, setRecommendations] = useState([])
  
  // Coupon state
  const [couponInput, setCouponInput] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState(null)
  const [couponError, setCouponError] = useState('')
  const [couponSuccess, setCouponSuccess] = useState('')

  // Accordion states
  const [helpOpen, setHelpOpen] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState({})

  // Fetch recommended products
  useEffect(() => {
    fetch('/api/products?limit=4')
      .then((r) => r.json())
      .then((data) => {
        // Filter out items that are already in the cart if possible
        const cartSlugs = items.map(item => item.variant?.product?.slug)
        const filtered = data.filter(p => !cartSlugs.includes(p.slug))
        setRecommendations(filtered.slice(0, 3))
      })
      .catch(() => {})
  }, [items])

  function toggleProductDetails(variantId) {
    setDetailsOpen(prev => ({
      ...prev,
      [variantId]: !prev[variantId]
    }))
  }

  function handleApplyCoupon() {
    setCouponError('')
    setCouponSuccess('')
    
    const code = couponInput.trim().toUpperCase()
    if (!code) return

    if (code === 'WELCOME10') {
      setAppliedCoupon({ code, type: 'percent', value: 10 })
      setCouponSuccess('Coupon applied successfully! 10% discount added.')
    } else {
      setCouponError('Invalid coupon code. Try WELCOME10.')
      setAppliedCoupon(null)
    }
  }

  function handleProceed() {
    router.push('/checkout')
  }

  // Calculations
  const subtotal = items.reduce((s, i) => s + i.variant.price * i.quantity, 0)
  
  // Apply coupon discount if any
  let discount = 0
  if (appliedCoupon) {
    if (appliedCoupon.type === 'percent') {
      discount = Math.round(subtotal * (appliedCoupon.value / 100))
    }
  }

  const discountedSubtotal = subtotal - discount
  const shipping = discountedSubtotal >= SHIPPING_THRESHOLD || items.length === 0 ? 0 : SHIPPING_COST
  const gst = Math.round(discountedSubtotal * GST_RATE)
  const total = discountedSubtotal + shipping + gst

  return (
    <div style={{ background: '#ffffff', minHeight: '100vh', padding: '40px 48px 100px 48px' }}>
      {/* Title */}
      <h1
        style={{
          fontFamily: 'Cormorant Garamond, serif',
          fontWeight: 300,
          fontStyle: 'italic',
          fontSize: 'clamp(2.2rem, 5vw, 3.8rem)',
          color: 'var(--black)',
          lineHeight: 1.1,
          marginBottom: '48px',
          letterSpacing: '0.01em',
        }}
      >
        Cart
      </h1>

      {items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <p style={{ fontFamily: 'Jost, sans-serif', fontWeight: 300, fontSize: 14, color: 'var(--gray)', marginBottom: 28 }}>
            Your cart is empty.
          </p>
          <Link
            href="/shop"
            style={{
              fontFamily: 'Jost, sans-serif',
              fontWeight: 400,
              fontSize: 11,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--black)',
              borderBottom: '1px solid var(--black)',
              paddingBottom: 4,
              textDecoration: 'none',
              transition: 'opacity 0.2s',
            }}
            className="hover:opacity-75"
          >
            Continue Shopping
          </Link>
        </div>
      ) : (
        <div 
          className="flex flex-col lg:flex-row gap-16" 
          style={{ display: 'flex', flexWrap: 'wrap', width: '100%' }}
        >
          {/* Left Column — Cart items */}
          <div style={{ flex: '1 1 60%', minWidth: '320px' }}>
            <h2
              style={{
                fontFamily: 'Cormorant Garamond, serif',
                fontSize: 24,
                fontWeight: 300,
                color: 'var(--black)',
                borderBottom: '1px solid var(--border)',
                paddingBottom: 16,
                marginBottom: 0
              }}
            >
              Cart ({items.length} {items.length === 1 ? 'product' : 'products'})
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {items.map(({ variantId, variant, quantity }) => {
                const isExpanded = !!detailsOpen[variantId]
                const productDesc = variant.product?.description || "A premium linen apparel designed for natural breathability and everyday luxury."
                const productFabric = variant.product?.fabric || "100% Organic Premium Linen"
                const productCare = variant.product?.care || "Dry clean or gentle hand wash in cold water. Iron inside out."
                const imageSource = variant.images?.[0]?.url || variant.product?.image || null

                return (
                  <div
                    key={variantId}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      borderBottom: '1px solid var(--border)',
                      padding: '24px 0',
                    }}
                  >
                    <div style={{ display: 'flex', gap: 24 }}>
                      {/* Product Thumbnail Image */}
                      <div 
                        style={{ 
                          width: 100, 
                          height: 125, 
                          background: 'var(--light)', 
                          position: 'relative', 
                          overflow: 'hidden', 
                          flexShrink: 0 
                        }}
                      >
                        {imageSource ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={imageSource}
                            alt={variant.product?.name || 'Item'}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <div style={{ display: 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--gray)', fontSize: 10, fontFamily: 'Jost, sans-serif' }}>
                            Linen
                          </div>
                        )}
                      </div>

                      {/* Product Information */}
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div>
                          {/* SKU */}
                          <p style={{
                            fontFamily: 'Jost, sans-serif',
                            fontSize: 10,
                            fontWeight: 400,
                            color: 'var(--gray)',
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                            margin: '0 0 4px 0',
                          }}>
                            SKU: {variant.sku || `BIA-${variantId.slice(0, 8).toUpperCase()}`}
                          </p>

                          {/* Product Name */}
                          <h3 style={{
                            fontFamily: 'Jost, sans-serif',
                            fontSize: 14,
                            fontWeight: 400,
                            color: 'var(--black)',
                            margin: '0 0 6px 0',
                          }}>
                            {variant.product?.name || 'Product'}
                          </h3>

                          {/* Options */}
                          <p style={{
                            fontFamily: 'Jost, sans-serif',
                            fontSize: 12,
                            fontWeight: 300,
                            color: 'var(--gray)',
                            margin: '0 0 16px 0',
                          }}>
                            Color: {variant.color} &nbsp;&middot;&nbsp; Size: {variant.size}
                          </p>

                          {/* Dropdown / Details link */}
                          <button
                            onClick={() => toggleProductDetails(variantId)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--black)',
                              fontFamily: 'Jost, sans-serif',
                              fontSize: 11,
                              fontWeight: 300,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              padding: 0,
                              letterSpacing: '0.05em',
                              outline: 'none',
                              marginBottom: 8
                            }}
                          >
                            Product details &nbsp;
                            <svg 
                              width="8" 
                              height="8" 
                              viewBox="0 0 24 24" 
                              fill="none" 
                              stroke="currentColor" 
                              strokeWidth="2" 
                              style={{ 
                                transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', 
                                transition: 'transform 0.2s ease-in-out' 
                              }}
                            >
                              <path d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        </div>

                        {/* Quantity Controls & Price */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
                          {/* Numeric Quantity Selector */}
                          <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border)', background: '#ffffff' }}>
                            <button
                              onClick={() => updateQty(variantId, quantity - 1)}
                              style={{
                                width: 28,
                                height: 28,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: 13,
                                color: 'var(--black)',
                              }}
                              className="hover:opacity-60"
                            >
                              &minus;
                            </button>
                            <span style={{
                              width: 24,
                              textAlign: 'center',
                              fontSize: 11,
                              fontFamily: 'Jost, sans-serif',
                              color: 'var(--black)',
                            }}>
                              {quantity}
                            </span>
                            <button
                              onClick={() => updateQty(variantId, quantity + 1)}
                              style={{
                                width: 28,
                                height: 28,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: 13,
                                color: 'var(--black)',
                              }}
                              className="hover:opacity-60"
                            >
                              +
                            </button>
                          </div>

                          {/* Price & Delete Button */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                            <span style={{
                              fontFamily: 'Jost, sans-serif',
                              fontSize: 13,
                              fontWeight: 400,
                              color: 'var(--black)',
                            }}>
                              {formatPrice(variant.price * quantity)}
                            </span>
                            <button
                              onClick={() => remove(variantId)}
                              aria-label="Remove item"
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: 'var(--gray)',
                                display: 'flex',
                                alignItems: 'center',
                                padding: 4,
                              }}
                              className="hover:text-red-700 transition-colors"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Expandable Product Details Accordion */}
                    {isExpanded && (
                      <div style={{
                        marginTop: 16,
                        padding: '16px 20px',
                        background: '#fcfbf9',
                        border: '1px solid var(--border)',
                        fontSize: 12,
                        color: 'var(--black)',
                        fontFamily: 'Jost, sans-serif',
                        lineHeight: 1.6,
                        animation: 'fadeIn 0.2s ease-out'
                      }}>
                        <p style={{ margin: '0 0 10px 0' }}><strong>Description:</strong> {productDesc}</p>
                        <p style={{ margin: '0 0 10px 0' }}><strong>Fabric:</strong> {productFabric}</p>
                        <p style={{ margin: 0 }}><strong>Care Instructions:</strong> {productCare}</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Right Column — Summary panel */}
          <div style={{ flex: '1 1 30%', minWidth: '300px' }}>
            <div style={{
              background: '#faf9f6',
              padding: '32px 28px',
              border: '1px solid var(--border)',
              position: 'sticky',
              top: '88px',
            }}>
              <h2 style={{
                fontFamily: 'Jost, sans-serif',
                fontSize: 11,
                fontWeight: 400,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: 'var(--black)',
                marginTop: 0,
                marginBottom: 24,
                borderBottom: '1px solid var(--border)',
                paddingBottom: 12,
              }}>
                Summary
              </h2>

              {/* Subtotal */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <span style={{ fontFamily: 'Jost, sans-serif', fontSize: 12, color: 'var(--gray)' }}>Subtotal</span>
                <span style={{ fontFamily: 'Jost, sans-serif', fontSize: 13, color: 'var(--black)' }}>{formatPrice(subtotal)}</span>
              </div>

              {/* Shipping times and costs */}
              <div style={{ display: 'flex', flexDirection: 'column', borderBottom: '1px solid var(--border)', paddingBottom: 16, marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontFamily: 'Jost, sans-serif', fontSize: 12, color: 'var(--gray)' }}>Shipping Times and Costs</span>
                  <span style={{ fontFamily: 'Jost, sans-serif', fontSize: 13, color: 'var(--black)' }}>{shipping === 0 ? 'Free' : formatPrice(shipping)}</span>
                </div>
                <span style={{ fontFamily: 'Jost, sans-serif', fontSize: 10, color: 'var(--gray)', lineHeight: 1.4, fontStyle: 'italic' }}>
                  Item will be shipped in 5 to 7 days after receipt of order confirmation.
                </span>
              </div>

              {/* Discount Code Section */}
              <div style={{ marginBottom: 20 }}>
                <label style={{
                  fontFamily: 'Jost, sans-serif',
                  fontSize: 10,
                  fontWeight: 400,
                  color: 'var(--gray)',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  display: 'block',
                  marginBottom: 8
                }}>
                  Discount Code
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    placeholder="Enter your discount code here"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    style={{
                      flex: 1,
                      border: '1px solid var(--border)',
                      padding: '8px 12px',
                      fontSize: 11,
                      fontFamily: 'Jost, sans-serif',
                      background: '#ffffff',
                      outline: 'none',
                      color: 'var(--black)',
                    }}
                  />
                  <button
                    onClick={handleApplyCoupon}
                    style={{
                      background: '#ffffff',
                      border: '1px solid var(--black)',
                      padding: '8px 16px',
                      fontSize: 11,
                      fontFamily: 'Jost, sans-serif',
                      letterSpacing: '0.08em',
                      color: 'var(--black)',
                      cursor: 'pointer',
                    }}
                    className="hover:bg-zinc-100 transition-colors"
                  >
                    APPLY
                  </button>
                </div>
                {couponError && (
                  <p style={{ fontFamily: 'Jost, sans-serif', fontSize: 11, color: '#cc0000', margin: '6px 0 0 0' }}>{couponError}</p>
                )}
                {couponSuccess && (
                  <p style={{ fontFamily: 'Jost, sans-serif', fontSize: 11, color: '#27ae60', margin: '6px 0 0 0' }}>{couponSuccess}</p>
                )}
              </div>

              {/* Total Taxes inc. */}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: 16, marginBottom: 24 }}>
                <span style={{ fontFamily: 'Jost, sans-serif', fontSize: 13, fontWeight: 400, color: 'var(--black)' }}>Total Taxes inc.</span>
                <span style={{ fontFamily: 'Jost, sans-serif', fontSize: 14, fontWeight: 500, color: 'var(--black)' }}>{formatPrice(total)}</span>
              </div>

              {/* Proceed Button */}
              <button
                onClick={handleProceed}
                style={{
                  width: '100%',
                  background: 'var(--black)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '16px',
                  fontSize: 11,
                  fontFamily: 'Jost, sans-serif',
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  transition: 'opacity 0.2s',
                }}
                className="hover:opacity-90"
              >
                PROCEED
              </button>

              {/* Promo information */}
              <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 16, borderTop: '1px solid var(--border)', paddingTop: 24 }}>
                {/* Free shipping banner */}
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--black)" strokeWidth="1.5" style={{ flexShrink: 0, marginTop: 1 }}>
                    <circle cx="12" cy="12" r="10" />
                    <line x1="2" y1="12" x2="22" y2="12" />
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                  </svg>
                  <p style={{ margin: 0, fontSize: 11, color: 'var(--black)', fontFamily: 'Jost, sans-serif', lineHeight: 1.5 }}>
                    We offer free shipping on all orders with Express Worldwide service.
                  </p>
                </div>

                {/* Return policy banner */}
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--black)" strokeWidth="1.5" style={{ flexShrink: 0, marginTop: 1 }}>
                    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                  </svg>
                  <p style={{ margin: 0, fontSize: 11, color: 'var(--black)', fontFamily: 'Jost, sans-serif', lineHeight: 1.5 }}>
                    We Guarantee 10 days to return or exchange starting from the delivery date of the order.
                  </p>
                </div>

                {/* Accordion HELP */}
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                  <button
                    onClick={() => setHelpOpen(!helpOpen)}
                    style={{
                      width: '100%',
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontFamily: 'Jost, sans-serif',
                      fontSize: 10,
                      fontWeight: 400,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: 'var(--black)',
                      cursor: 'pointer',
                      outline: 'none',
                    }}
                  >
                    <span>MAY WE HELP YOU?</span>
                    <span>{helpOpen ? '&minus;' : '+'}</span>
                  </button>

                  {helpOpen && (
                    <div style={{
                      marginTop: 12,
                      fontSize: 11,
                      color: 'var(--gray)',
                      fontFamily: 'Jost, sans-serif',
                      lineHeight: 1.6,
                      animation: 'fadeIn 0.2s ease-out'
                    }}>
                      <p style={{ margin: '0 0 12px 0' }}>
                        Our customer service team is here to assist you with styling advice, sizing sizing, shipping, or returns.
                      </p>
                      <a
                        href="mailto:support@biahama.com"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 8,
                          color: 'var(--black)',
                          textDecoration: 'underline',
                          fontWeight: 400
                        }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                          <polyline points="22,6 12,13 2,6" />
                        </svg>
                        Contact us by email
                      </a>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Recommended Products Bottom Section */}
      {items.length > 0 && recommendations.length > 0 && (
        <div style={{ marginTop: 88, borderTop: '1px solid var(--border)', paddingTop: 64 }}>
          <h2
            style={{
              fontFamily: 'Cormorant Garamond, serif',
              fontSize: '28px',
              fontWeight: 300,
              fontStyle: 'italic',
              color: 'var(--black)',
              marginBottom: 36,
              letterSpacing: '0.02em',
            }}
          >
            You may also be interested in
          </h2>
          <div 
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
              gap: 24,
            }}
          >
            {recommendations.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
