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

  // Accordion states
  const [accordions, setAccordions] = useState({
    description: true,
    materials: true,
    details: false,
    packaging: false,
    shipping: false,
  })

  // Ensure we have exactly 6 images stacked vertically
  const displayImages = []
  if (product.images && product.images.length > 0) {
    for (let i = 0; i < 6; i++) {
      displayImages.push(product.images[i % product.images.length].url)
    }
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

  const toggleAccordion = (key) => {
    setAccordions(prev => ({ ...prev, [key]: !prev[key] }))
  }

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

  const handleScrollToDetails = () => {
    const el = document.getElementById('details-section')
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

      <div className="max-w-7xl mx-auto px-6 md:px-12 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          
          {/* Left Column — 6 stacked gapless images */}
          <div className="lg:col-span-7 flex flex-col gap-0 border border-zinc-200 overflow-hidden">
            {displayImages.map((src, i) => (
              <div key={i} className="relative w-full overflow-hidden bg-zinc-50" style={{ aspectRatio: '4/5' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={`${product.name} detail view ${i + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>

          {/* Right Column — Sticky product info */}
          <div className="lg:col-span-5 lg:sticky lg:top-[88px] space-y-6 pt-2">
            
            {/* Header utilities (sku, share, wishlist) */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] tracking-widest text-zinc-400 uppercase font-medium">
                SKU: {product.variants?.[0]?.sku || 'BIA-LNN-01'}
              </span>
              <div className="flex items-center gap-4">
                {/* Share Button */}
                <button
                  onClick={handleShare}
                  className="text-xs uppercase tracking-widest hover:opacity-60 transition-opacity flex items-center gap-1.5"
                  style={{ fontFamily: 'Jost, sans-serif', color: 'var(--black)' }}
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

                {/* Hanger Wishlist button */}
                <button
                  onClick={() => setWishlisted(!wishlisted)}
                  aria-label="Save to wardrobe"
                  className="p-1.5 rounded-full hover:bg-zinc-50 transition-colors"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={wishlisted ? 'var(--black)' : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 3 a2 2 0 0 1 2 2 a2 2 0 0 1 -2 2" />
                    <path d="M12 7 L3 16" />
                    <path d="M12 7 L21 16" />
                    <line x1="2" y1="16" x2="22" y2="16" />
                    <line x1="2" y1="16" x2="2" y2="19" />
                    <line x1="22" y1="16" x2="22" y2="19" />
                    <line x1="2" y1="19" x2="22" y2="19" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Product Title and Price */}
            <div className="space-y-2 border-b border-zinc-100 pb-5">
              <h1
                className="text-2xl md:text-3xl leading-tight font-light"
                style={{ fontFamily: 'Jost, sans-serif', color: 'var(--black)' }}
              >
                {product.name}
              </h1>
              <p
                className="text-lg font-semibold"
                style={{ fontFamily: 'Jost, sans-serif', color: 'var(--black)' }}
              >
                {formatPrice(product.variants?.[0]?.price || 0)}
              </p>
            </div>

            {/* Color Swatch Panel */}
            <div className="space-y-2">
              <span className="text-[10px] tracking-widest text-zinc-400 uppercase font-medium">
                COLOR: <span className="text-zinc-800">{product.variants?.[0]?.color || 'Natural Cocoa'}</span>
              </span>
              <div className="flex gap-2">
                <span
                  className="w-10 h-14 border border-zinc-900 flex items-center justify-center p-0.5"
                  title={product.variants?.[0]?.color}
                >
                  <span
                    className="w-full h-full"
                    style={{ background: product.variants?.[0]?.colorHex || '#5e5045' }}
                  />
                </span>
              </div>
            </div>

            {/* Sizes Selection Pills */}
            <div className="space-y-3 pt-2">
              <span className="text-[10px] tracking-widest text-zinc-400 uppercase font-medium">
                Select Size
              </span>
              <div className="flex flex-wrap gap-2">
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
                        fontFamily: 'Jost, sans-serif',
                        fontWeight: isSelected ? 500 : 300,
                        border: isSelected
                          ? '1.5px solid var(--black)'
                          : '1px solid var(--border)',
                        background: isSelected ? 'var(--black)' : 'transparent',
                        color: isSelected
                          ? '#ffffff'
                          : isInStock
                          ? 'var(--black)'
                          : '#a1a1aa',
                        opacity: isInStock ? 1 : 0.4,
                        cursor: isInStock ? 'pointer' : 'not-allowed',
                      }}
                    >
                      {size}
                    </button>
                  )
                })}
              </div>
              
              {/* Validation alert message */}
              {sizeError && (
                <p className="text-red-500 text-xs font-medium animate-pulse" style={{ fontFamily: 'Jost, sans-serif' }}>
                  Please select a size
                </p>
              )}
            </div>

            {/* PDP Action Buttons */}
            <div className="space-y-3 pt-6">
              
              {/* + VIEW DETAILS (Link above Add to Bag) */}
              <button
                onClick={handleScrollToDetails}
                className="text-xs uppercase tracking-widest hover:opacity-60 transition-opacity font-medium block"
                style={{ fontFamily: 'Jost, sans-serif', color: 'var(--black)', letterSpacing: '0.12em' }}
              >
                + View Details
              </button>

              {/* Add to Bag Button */}
              <button
                onClick={handleAddToBag}
                disabled={adding}
                className="w-full py-4 text-xs tracking-widest uppercase transition-colors flex items-center justify-center gap-2"
                style={{
                  background: 'var(--black)',
                  color: '#ffffff',
                  fontFamily: 'Jost, sans-serif',
                  fontWeight: 400,
                }}
              >
                {adding ? 'Adding...' : 'ADD TO BAG 🛍'}
              </button>

              {/* Razorpay Express Checkout */}
              <button
                onClick={handleFastCheckout}
                disabled={checkoutLoading}
                className="w-full py-3.5 text-xs tracking-widest uppercase border transition-colors flex items-center justify-center gap-2 bg-[#1c2c54] text-white hover:bg-opacity-95"
                style={{
                  fontFamily: 'Jost, sans-serif',
                  fontWeight: 400,
                  borderColor: '#1c2c54'
                }}
              >
                {checkoutLoading ? 'Opening checkout...' : 'Pay with Razorpay'}
              </button>
            </div>

            {/* Delivery/Shipping details text */}
            <div className="pt-2 text-center">
              <span className="text-[10px] tracking-widest text-zinc-500 uppercase font-medium">
                Free shipping and 7 Days to Return
              </span>
            </div>

          </div>

        </div>

        {/* Bottom Specifications Accordion Area */}
        <div id="details-section" className="border-t border-zinc-200 pt-16 mt-20 grid grid-cols-1 md:grid-cols-2 gap-12">
          
          {/* Left Column: Description & Details */}
          <div className="space-y-6">
            
            {/* Description Tab */}
            <div className="border-b border-zinc-100 pb-6">
              <button
                onClick={() => toggleAccordion('description')}
                className="w-full flex items-center justify-between text-left font-light text-base tracking-wide py-2"
                style={{ fontFamily: 'Jost, sans-serif', color: 'var(--black)' }}
              >
                <span>Description</span>
                <span>{accordions.description ? '—' : '+'}</span>
              </button>
              {accordions.description && (
                <p className="mt-4 text-sm font-light text-zinc-600 leading-relaxed max-w-xl">
                  {product.description || 'Crafted with premium Indian linen, this clothing piece combines breathability with architectural silhouette lines. Designed for effortless transitions from morning to evening settings.'}
                </p>
              )}
            </div>

            {/* Details Tab */}
            <div className="border-b border-zinc-100 pb-6">
              <button
                onClick={() => toggleAccordion('details')}
                className="w-full flex items-center justify-between text-left font-light text-base tracking-wide py-2"
                style={{ fontFamily: 'Jost, sans-serif', color: 'var(--black)' }}
              >
                <span>Details & Care</span>
                <span>{accordions.details ? '—' : '+'}</span>
              </button>
              {accordions.details && (
                <div className="mt-4 text-sm font-light text-zinc-600 space-y-2 leading-relaxed">
                  <p>{product.care || 'Gentle hand wash in cold water with mild detergent.'}</p>
                  <p>Do not tumble dry. Dry flat in shade. Cool iron on reverse if needed.</p>
                  <p>Handcrafted in limited batches in India.</p>
                </div>
              )}
            </div>

          </div>

          {/* Right Column: Materials, Packaging, Shipping */}
          <div className="space-y-6">
            
            {/* Materials Tab */}
            <div className="border-b border-zinc-100 pb-6">
              <button
                onClick={() => toggleAccordion('materials')}
                className="w-full flex items-center justify-between text-left font-light text-base tracking-wide py-2"
                style={{ fontFamily: 'Jost, sans-serif', color: 'var(--black)' }}
              >
                <span>Materials</span>
                <span>{accordions.materials ? '—' : '+'}</span>
              </button>
              {accordions.materials && (
                <p className="mt-4 text-sm font-light text-zinc-600 leading-relaxed">
                  {product.fabric || '100% Organic hand-spun Indian linen yarns. Structured yet lightweight breathable weave.'}
                </p>
              )}
            </div>

            {/* Packaging Tab */}
            <div className="border-b border-zinc-100 pb-6">
              <button
                onClick={() => toggleAccordion('packaging')}
                className="w-full flex items-center justify-between text-left font-light text-base tracking-wide py-2"
                style={{ fontFamily: 'Jost, sans-serif', color: 'var(--black)' }}
              >
                <span>Packaging</span>
                <span>{accordions.packaging ? '—' : '+'}</span>
              </button>
              {accordions.packaging && (
                <p className="mt-4 text-sm font-light text-zinc-600 leading-relaxed">
                  All linen garments are folded carefully in tissue layers and shipped inside our signature architectural boxes, completely plastic-free and reusable.
                </p>
              )}
            </div>

            {/* Shipping & Returns Tab */}
            <div className="border-b border-zinc-100 pb-6">
              <button
                onClick={() => toggleAccordion('shipping')}
                className="w-full flex items-center justify-between text-left font-light text-base tracking-wide py-2"
                style={{ fontFamily: 'Jost, sans-serif', color: 'var(--black)' }}
              >
                <span>Shipping & Returns</span>
                <span>{accordions.shipping ? '—' : '+'}</span>
              </button>
              {accordions.shipping && (
                <p className="mt-4 text-sm font-light text-zinc-600 leading-relaxed">
                  Free express shipping on all orders across India. Orders are dispatched within 24 hours. We offer hassle-free home returns and size exchanges within 7 days of delivery.
                </p>
              )}
            </div>

          </div>

        </div>

      </div>
    </>
  )
}
