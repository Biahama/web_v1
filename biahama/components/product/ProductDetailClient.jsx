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

      <div className="w-full max-w-none px-6 md:px-12 pb-24 mt-[-32px] pt-[10px]">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-start">
          
          {/* Left Column — stacked gapless images */}
          <div className="flex flex-col gap-0 overflow-hidden">
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
          <div className="lg:sticky lg:top-[76px] space-y-8 pt-2 w-full lg:pr-[12px]">
            
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
                  <img
                    src="/cloth-hanger.png"
                    alt="Save to wardrobe"
                    style={{
                      width: '18px',
                      height: '18px',
                      objectFit: 'contain',
                      filter: wishlisted ? 'none' : 'opacity(0.6)'
                    }}
                  />
                </button>
              </div>
            </div>

            {/* Product Title and Price */}
            {/* Product Title and Price */}
            <div className="space-y-2 border-b border-zinc-100 pb-8">
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
            <div className="flex items-start gap-4 pt-8 pb-8 border-b border-zinc-100">
              <span className="text-[10px] tracking-widest text-zinc-400 uppercase font-medium w-16 pt-1">
                COLOR
              </span>
              <div className="flex flex-col items-center gap-1.5">
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
                <span className="text-[10px] tracking-wide text-zinc-800 font-light" style={{ fontFamily: 'Jost, sans-serif' }}>
                  {product.variants?.[0]?.color || 'Natural Cocoa'}
                </span>
              </div>
            </div>
 
            {/* Sizes Selection Pills */}
            <div className="space-y-4 pt-8 pb-8 border-b border-zinc-100">
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
            <div className="pt-8 space-y-6">
              
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
                className="w-full text-sm tracking-widest uppercase transition-colors flex items-center justify-center gap-2 font-medium"
                style={{
                  background: 'var(--black)',
                  color: '#ffffff',
                  fontFamily: 'Jost, sans-serif',
                  height: '60px',
                }}
              >
                {adding ? 'Adding...' : 'ADD TO BAG 👜'}
              </button>
 
              {/* Razorpay Express Checkout */}
              <button
                onClick={handleFastCheckout}
                disabled={checkoutLoading}
                className="w-full text-sm tracking-widest uppercase border transition-colors flex items-center justify-center gap-2 bg-[#1c2c54] text-white hover:bg-opacity-95 font-medium"
                style={{
                  fontFamily: 'Jost, sans-serif',
                  borderColor: '#1c2c54',
                  height: '60px',
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
        <div id="details-section" className="mt-32 lg:mt-48 pb-32 w-full">
          
          {/* 2-Column Grid for Description, Details, Materials, Packaging */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-16 lg:gap-x-24 items-start">
            
            {/* Left Column: Description & Details */}
            <div className="border-t border-zinc-200 flex flex-col">
              
              {/* Description Tab */}
              <div className="border-b border-zinc-200 pt-8 pb-12">
                <button
                  onClick={() => toggleAccordion('description')}
                  className="w-full flex items-center justify-between text-left font-light text-[11px] tracking-[0.25em] uppercase"
                  style={{ fontFamily: 'Jost, sans-serif', color: 'var(--black)' }}
                >
                  <span>DESCRIPTION</span>
                  <span className="text-[14px] font-light">{accordions.description ? '—' : '+'}</span>
                </button>
                {accordions.description && (
                  <p className="mt-6 text-[11px] font-light text-zinc-500 tracking-wide max-w-xl" style={{ fontFamily: 'Jost, sans-serif', lineHeight: '1.8', letterSpacing: '0.05em' }}>
                    {product.description || 'Crafted with premium Indian linen, this clothing piece combines breathability with architectural silhouette lines. Designed for effortless transitions from morning to evening settings.'}
                  </p>
                )}
              </div>

              {/* Details Tab */}
              <div className="border-b border-zinc-200 pt-8 pb-12">
                <button
                  onClick={() => toggleAccordion('details')}
                  className="w-full flex items-center justify-between text-left font-light text-[11px] tracking-[0.25em] uppercase"
                  style={{ fontFamily: 'Jost, sans-serif', color: 'var(--black)' }}
                >
                  <span>DETAILS & CARE</span>
                  <span className="text-[14px] font-light">{accordions.details ? '—' : '+'}</span>
                </button>
                {accordions.details && (
                  <div className="mt-6 text-[11px] font-light text-zinc-500 space-y-2 leading-[1.8] tracking-wide" style={{ fontFamily: 'Jost, sans-serif', letterSpacing: '0.05em' }}>
                    <p>Handcrafted linen knitwear</p>
                    <p>Unstructured relaxed shoulder</p>
                    <p>Rib knit collar and clean hem</p>
                    <p>Special workmanship</p>
                    <div className="pt-2 font-medium text-zinc-800 tracking-widest text-[10px]">
                      100% ORGANIC LINEN
                    </div>
                  </div>
                )}
              </div>

            </div>

            {/* Right Column: Materials & Packaging */}
            <div className="border-t border-zinc-200 flex flex-col">
              
              {/* Materials Tab */}
              <div className="border-b border-zinc-200 pt-8 pb-12">
                <button
                  onClick={() => toggleAccordion('materials')}
                  className="w-full flex items-center justify-between text-left font-light text-[11px] tracking-[0.25em] uppercase"
                  style={{ fontFamily: 'Jost, sans-serif', color: 'var(--black)' }}
                >
                  <span>MATERIALS</span>
                  <span className="text-[14px] font-light">{accordions.materials ? '—' : '+'}</span>
                </button>
                {accordions.materials && (
                  <div className="mt-6 text-[11px] font-light text-zinc-500 space-y-4 leading-[1.8] tracking-wide max-w-xl" style={{ fontFamily: 'Jost, sans-serif', letterSpacing: '0.05em' }}>
                    <p>{product.fabric || '100% Organic hand-spun Indian linen yarns. Structured yet lightweight breathable weave.'}</p>
                    <p>Our items are manufactured in limited artisanal batches in India, respecting local craft traditions and community development.</p>
                    <p>Dry clean or gentle hand wash is recommended to preserve the linen fibers.</p>
                  </div>
                )}
              </div>

              {/* Packaging Tab */}
              <div className="border-b border-zinc-200 pt-8 pb-12">
                <button
                  onClick={() => toggleAccordion('packaging')}
                  className="w-full flex items-center justify-between text-left font-light text-[11px] tracking-[0.25em] uppercase"
                  style={{ fontFamily: 'Jost, sans-serif', color: 'var(--black)' }}
                >
                  <span>PACKAGING</span>
                  <span className="text-[14px] font-light">{accordions.packaging ? '—' : '+'}</span>
                </button>
                {accordions.packaging && (
                  <div className="mt-6 flex gap-4 items-start">
                    <div className="w-1/3 max-w-[150px] aspect-[4/3] bg-zinc-100 flex items-center justify-center overflow-hidden border border-zinc-100">
                      <img
                        src="/images/packaging.png"
                        alt="Packaging boxes"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    </div>
                    <p className="w-2/3 text-[11px] font-light text-zinc-500 tracking-wide leading-[1.8]" style={{ fontFamily: 'Jost, sans-serif', letterSpacing: '0.05em' }}>
                      All linen garments are folded carefully in tissue layers and shipped inside our signature architectural boxes, completely plastic-free and reusable.
                    </p>
                  </div>
                )}
              </div>

            </div>

          </div>

          {/* Shipping & Returns Tab (Full Width) */}
          <div className="border-b border-zinc-200 mt-8 pt-8 pb-12 w-full">
            <button
              onClick={() => toggleAccordion('shipping')}
              className="w-full flex items-center justify-between text-left font-light text-[11px] tracking-[0.25em] uppercase"
              style={{ fontFamily: 'Jost, sans-serif', color: 'var(--black)' }}
            >
              <span>SHIPPING & RETURNS</span>
              <span className="text-[14px] font-light">{accordions.shipping ? '—' : '+'}</span>
            </button>
            {accordions.shipping && (
              <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24">
                <div>
                  <h4 className="text-[14px] font-light text-zinc-800 tracking-wider uppercase mb-2">
                    Shipping Times and Costs
                  </h4>
                  <p className="text-[11px] font-light text-zinc-500 tracking-wide leading-[1.8]" style={{ fontFamily: 'Jost, sans-serif', letterSpacing: '0.05em' }}>
                    Shipping of all of our garments is always free. Express courier delivery across India, usually within 3-5 working days.
                  </p>
                </div>
                <div>
                  <h4 className="text-[14px] font-light text-zinc-800 tracking-wider uppercase mb-2">
                    Method of Return
                  </h4>
                  <p className="text-[11px] font-light text-zinc-500 tracking-wide leading-[1.8]" style={{ fontFamily: 'Jost, sans-serif', letterSpacing: '0.05em' }}>
                    We offer free size exchanges and returns within 7 days of delivery. Return pickup will be arranged at your doorstep free of cost.
                  </p>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  )
}
