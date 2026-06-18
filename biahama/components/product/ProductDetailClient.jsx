'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useCart } from '@/lib/cart'
import Script from 'next/script'

function formatPrice(paise) {
  return `₹${(paise / 100).toLocaleString('en-IN')}`
}

export default function ProductDetailClient({ product }) {
  const { data: session } = useSession()
  const router = useRouter()
  const { add } = useCart()

  const [selectedSize, setSelectedSize] = useState(null)
  const [sizeError, setSizeError] = useState(false)
  const [adding, setAdding] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [addresses, setAddresses] = useState([])
  const [wishlisted, setWishlisted] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  // Stacked vertically images
  const displayImages = []
  if (product.images && product.images.length > 0) {
    product.images.forEach(img => {
      displayImages.push(typeof img === 'string' ? img : img.url)
    })
  } else {
    // Elegant fashion fallback images
    const fallbacks = [
      'https://images.unsplash.com/photo-1609357605129-26f69add5d6e?auto=format&fit=crop&w=600&h=800&q=80',
      'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=600&h=800&q=80',
      'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&w=600&h=800&q=80',
      'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=600&h=800&q=80',
      'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=600&h=800&q=80',
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=600&h=800&q=80',
    ]
    for (let i = 0; i < 6; i++) {
      displayImages.push(fallbacks[i])
    }
  }

  // Fetch addresses on mount if logged in (for fast checkout)
  useEffect(() => {
    if (session) {
      fetch('/api/addresses')
        .then(r => r.json())
        .then(setAddresses)
        .catch(() => {})
    }
  }, [session])

  // Get active size options from product variants
  const availableSizes = ['S', 'M', 'L', 'XL', '2XL', '3XL']
  const inStockSizes = product.variants
    ?.filter(v => v.stockQty > 0)
    .map(v => v.size.toUpperCase()) || []

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleAddToBag = async () => {
    if (!selectedSize) {
      setSizeError(true)
      return
    }
    setSizeError(false)
    setAdding(true)

    // Find the variant matching the selected size
    const variant = product.variants?.find(
      v => v.size.toUpperCase() === selectedSize.toUpperCase()
    )

    if (variant) {
      await add({
        id: variant.id,
        price: variant.price,
        size: variant.size,
        color: variant.color,
        product: {
          name: product.name,
          slug: product.slug,
        }
      }, 1)
      alert(`${product.name} (Size ${selectedSize}) has been added to your bag.`)
    }
    setAdding(false)
  }

  const handleFastCheckout = async () => {
    if (!selectedSize) {
      setSizeError(true)
      return
    }
    setSizeError(false)

    if (!session) {
      // If guest, add to cart first, then redirect to cart page
      const variant = product.variants?.find(
        v => v.size.toUpperCase() === selectedSize.toUpperCase()
      )
      if (variant) {
        await add({
          id: variant.id,
          price: variant.price,
          size: variant.size,
          color: variant.color,
          product: {
            name: product.name,
            slug: product.slug,
          }
        }, 1)
      }
      router.push('/cart')
      return
    }

    setCheckoutLoading(true)

    // Check default address
    const defaultAddr = addresses.find(a => a.isDefault) || addresses[0]
    if (!defaultAddr) {
      // If no address, add to cart and redirect to cart to create address
      const variant = product.variants?.find(
        v => v.size.toUpperCase() === selectedSize.toUpperCase()
      )
      if (variant) {
        await add({
          id: variant.id,
          price: variant.price,
          size: variant.size,
          color: variant.color,
          product: {
            name: product.name,
            slug: product.slug,
          }
        }, 1)
      }
      router.push('/cart')
      return
    }

    // Add selected variant to cart first to prepare order
    const variant = product.variants?.find(
      v => v.size.toUpperCase() === selectedSize.toUpperCase()
    )
    if (variant) {
      await add({
        id: variant.id,
        price: variant.price,
        size: variant.size,
        color: variant.color,
        product: {
          name: product.name,
          slug: product.slug,
        }
      }, 1)
    }

    try {
      // Create Razorpay Order
      const res = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addressId: defaultAddr.id })
      })

      if (!res.ok) throw new Error('Order creation failed')

      const rzpData = await res.json()

      const options = {
        key: rzpData.keyId,
        amount: rzpData.amount,
        currency: rzpData.currency,
        name: 'BIAHAMA',
        description: `Checkout ${product.name}`,
        order_id: rzpData.orderId,
        prefill: rzpData.prefill,
        handler: async function (response) {
          try {
            const verifyRes = await fetch('/api/payments/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                addressId: defaultAddr.id
              })
            })

            const verifyData = await verifyRes.json()
            if (verifyRes.ok && verifyData.orderId) {
              router.push(`/orders/${verifyData.orderId}`)
            } else {
              alert('Payment verification failed. Please try again.')
            }
          } catch {
            alert('Verification connection error.')
          }
        },
        theme: { color: '#262626' }
      }

      const rzp = new window.Razorpay(options)
      rzp.open()
    } catch (e) {
      alert('Failed to initialize Razorpay checkout popup.')
    } finally {
      setCheckoutLoading(false)
    }
  }

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

      <div className="w-full max-w-none pl-6 pr-0 md:pl-12 md:pr-0 pb-24 mt-[-32px] pt-[10px]">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-start">
          
          {/* Left Column — Sticky Product Image */}
          <div 
            className="lg:sticky w-full overflow-hidden bg-zinc-50 relative aspect-[4/5] lg:h-[calc(100vh-var(--header-height))]"
            style={{ top: 'var(--header-height)' }}
          >
            {displayImages[0] && (
              <img
                src={displayImages[0]}
                alt={`${product.name} primary view`}
                className="w-full h-full object-cover"
              />
            )}

            {/* Circular Hanger Wishlist button */}
            <button
              onClick={() => setWishlisted(!wishlisted)}
              aria-label="Save to wardrobe"
              className="biahama-hanger-btn z-20 transition-colors"
              style={{
                width: 'var(--icon-hanger-btn)',
                height: 'var(--icon-hanger-btn)',
                borderRadius: '50%',
                background: 'var(--icon-hanger-btn-bg)',
                position: 'absolute',
                top: 'var(--space-2)',
                right: 'var(--space-2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
              }}
            >
              <img
                src="/cloth-hanger.png"
                alt="Save to wardrobe"
                style={{
                  width: 'var(--icon-hanger)',
                  height: 'var(--icon-hanger)',
                  objectFit: 'contain',
                  opacity: wishlisted ? 1.0 : 0.6,
                  filter: 'drop-shadow(0px 1px 2px rgba(255, 255, 255, 0.4))'
                }}
              />
            </button>
          </div>

          {/* Right Column — Scrollable Product Info */}
          <div 
            className="w-full pr-6 md:pr-12 flex flex-col gap-6"
            style={{ paddingTop: 'var(--space-5)' }} // 48px top padding on the info column
          >
            
            {/* Section 1: SKU & Share */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] tracking-widest text-zinc-400 uppercase font-medium">
                SKU: {product.variants?.[0]?.sku || 'BIA-LNN-01'}
              </span>
              <button
                onClick={handleShare}
                className="text-xs uppercase tracking-widest hover:opacity-60 transition-opacity flex items-center gap-1.5"
                style={{ fontFamily: 'var(--font-ui)', color: 'var(--black)' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
                <span>{copied ? 'Copied' : 'Share'}</span>
              </button>
            </div>

            {/* Section 2: Name and Price */}
            <div>
              <h1
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'var(--text-heading-size)',
                  fontWeight: 'var(--text-heading-weight)',
                  color: 'var(--black)',
                  letterSpacing: 'var(--text-heading-tracking)',
                  lineHeight: 'var(--text-heading-line-height)',
                }}
                className="leading-tight font-light"
              >
                {product.name}
              </h1>
              
              <p
                style={{
                  fontFamily: 'var(--font-ui)',
                  fontSize: 'var(--text-price-size)',
                  fontWeight: 'var(--text-price-weight)',
                  letterSpacing: 'var(--text-price-tracking)',
                  color: 'var(--black)',
                  marginTop: '12px', // 12px between name and price
                }}
              >
                {formatPrice(product.variants?.[0]?.price || 0)}
              </p>
              
              <div className="border-b border-zinc-200 mt-6" />
            </div>

            {/* Section 3: Color block */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
              <span className="biahama-tag" style={{ textTransform: 'uppercase' }}>
                COLOR
              </span>
              <div className="flex items-center gap-3">
                <div
                  className="w-11 h-14 border border-zinc-950 flex items-center justify-center p-0.5 bg-zinc-50"
                  title={product.variants?.[0]?.color}
                >
                  {displayImages[0] ? (
                    <img
                      src={displayImages[0]}
                      alt={product.variants?.[0]?.color || 'Swatch'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span
                      className="w-full h-full"
                      style={{ background: product.variants?.[0]?.colorHex || '#5e5045' }}
                    />
                  )}
                </div>
                <span className="biahama-tag">
                  {product.variants?.[0]?.color || 'Natural Cocoa'}
                </span>
              </div>
            </div>

            {/* Section 4: Size Selection */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
              <span className="biahama-tag" style={{ textTransform: 'uppercase' }}>
                SELECT SIZE
              </span>
              <div className="flex flex-wrap gap-2 mt-2">
                {availableSizes.map(size => {
                  const isInStock = inStockSizes.includes(size.toUpperCase())
                  const isSelected = selectedSize === size

                  return (
                    <button
                      key={size}
                      onClick={() => {
                        setSelectedSize(size)
                        setSizeError(false)
                      }}
                      disabled={!isInStock}
                      className="w-11 h-11 rounded-full flex items-center justify-center text-xs tracking-wider transition-all"
                      style={{
                        fontFamily: 'var(--font-ui)',
                        fontWeight: isSelected ? 'var(--text-tab-weight)' : 'var(--text-nav-weight)',
                        border: isSelected
                          ? '1.5px solid var(--black)'
                          : '1px solid var(--border)',
                        background: isSelected ? 'var(--black)' : 'transparent',
                        color: isSelected
                          ? 'var(--bg)'
                          : isInStock
                          ? 'var(--black)'
                          : 'var(--gray)',
                        opacity: isInStock ? 1 : 0.4,
                        cursor: isInStock ? 'pointer' : 'not-allowed',
                      }}
                    >
                      {size}
                    </button>
                  )
                })}
              </div>
              
              {sizeError && (
                <p className="text-red-500 text-xs font-medium animate-pulse mt-1" style={{ fontFamily: 'var(--font-ui)' }}>
                  Please select a size
                </p>
              )}
              
              <div className="border-b border-zinc-200 mt-6" />
            </div>

            {/* Section 5: Collapsible VIEW DETAILS accordion */}
            <div>
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="w-full flex items-center justify-between text-left font-medium text-xs tracking-widest uppercase hover:opacity-60 transition-opacity"
                style={{ fontFamily: 'var(--font-ui)', color: 'var(--black)', padding: '12px 0' }}
              >
                <span>{showDetails ? '— VIEW DETAILS' : '+ VIEW DETAILS'}</span>
              </button>
              {showDetails && (
                <div className="mt-4 space-y-6 text-[11px] font-light text-zinc-500 leading-[1.8] tracking-wide border-t border-zinc-100 pt-4" style={{ fontFamily: 'var(--font-ui)', letterSpacing: '0.05em' }}>
                  {/* Description */}
                  <div>
                    <h4 className="font-semibold text-zinc-800 uppercase mb-1">Description</h4>
                    <p>{product.description || 'Crafted with premium Indian linen, this clothing piece combines breathability with architectural silhouette lines. Designed for effortless transitions from morning to evening settings.'}</p>
                  </div>
                  {/* Details & Care */}
                  <div>
                    <h4 className="font-semibold text-zinc-800 uppercase mb-1">Details & Care</h4>
                    <div className="space-y-1">
                      <p>Handcrafted linen knitwear</p>
                      <p>Unstructured relaxed shoulder</p>
                      <p>Rib knit collar and clean hem</p>
                      <p>Special workmanship</p>
                      <div className="font-medium text-zinc-800 tracking-widest text-[10px] pt-1">
                        100% ORGANIC LINEN
                      </div>
                    </div>
                  </div>
                  {/* Materials */}
                  <div>
                    <h4 className="font-semibold text-zinc-800 uppercase mb-1">Materials</h4>
                    <p>{product.fabric || '100% Organic hand-spun Indian linen yarns. Structured yet lightweight breathable weave.'}</p>
                    <p>Our items are manufactured in limited artisanal batches in India, respecting local craft traditions and community development.</p>
                  </div>
                  {/* Packaging */}
                  <div>
                    <h4 className="font-semibold text-zinc-800 uppercase mb-1">Packaging</h4>
                    <div className="flex gap-4 items-start mt-2">
                      <div className="w-1/3 max-w-[120px] aspect-[4/3] bg-zinc-100 flex items-center justify-center overflow-hidden border border-zinc-100 shrink-0">
                        <img
                          src="/images/packaging.png"
                          alt="Packaging boxes"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      </div>
                      <p className="text-[11px] font-light text-zinc-500 leading-[1.6]">
                        All linen garments are folded carefully in tissue layers and shipped inside our signature architectural boxes, completely plastic-free and reusable.
                      </p>
                    </div>
                  </div>
                  {/* Shipping & Returns */}
                  <div>
                    <h4 className="font-semibold text-zinc-800 uppercase mb-1">Shipping & Returns</h4>
                    <p className="mb-2"><strong>Shipping:</strong> Free shipping across India, usually delivered within 3-5 working days.</p>
                    <p><strong>Returns:</strong> Free size exchanges and returns within 7 days of delivery.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Section 6: Action Buttons */}
            <div className="space-y-4 pt-4">
              <button
                onClick={handleAddToBag}
                disabled={adding}
                className="w-full text-sm tracking-widest uppercase transition-colors flex items-center justify-center gap-2 font-medium"
                style={{
                  background: 'var(--black)',
                  color: 'var(--bg)',
                  fontFamily: 'var(--font-ui)',
                  height: '60px',
                }}
              >
                {adding ? 'Adding...' : 'ADD TO BAG 👜'}
              </button>

              <button
                onClick={handleFastCheckout}
                disabled={checkoutLoading}
                className="w-full text-sm tracking-widest uppercase border transition-colors flex items-center justify-center gap-2 text-white hover:bg-opacity-95 font-medium"
                style={{
                  background: '#1c2c54',
                  borderColor: '#1c2c54',
                  fontFamily: 'var(--font-ui)',
                  height: '60px',
                }}
              >
                {checkoutLoading ? 'Opening checkout...' : 'Pay with Razorpay'}
              </button>
              
              <div className="pt-2 text-center">
                <span className="text-[10px] tracking-widest text-zinc-500 uppercase font-medium">
                  Free shipping and 7 Days to Return
                </span>
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  )
}
