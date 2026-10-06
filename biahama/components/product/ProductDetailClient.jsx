'use client'

import { useState } from 'react'
import { useAuth } from '@/components/providers/AuthProvider'
import { useRouter } from 'next/navigation'
import { useCart } from '@/lib/cart'
import { STORE_POLICY } from '@/lib/store-policy'
import Link from 'next/link'
import Image from 'next/image'
import { useWardrobe } from '@/lib/wardrobe'

function formatPrice(paise) {
  return `₹${(paise / 100).toLocaleString('en-IN')}`
}

// pdpSettings (from the admin panel): the buy button's text and
// whether the fast checkout button is shown. Defaults keep the
// page working even if no settings are passed.
export default function ProductDetailClient({
  product,
  pdpSettings = { addToBagText: 'ADD TO BAG', showFastCheckout: true },
}) {
  const { session } = useAuth()
  const router = useRouter()
  const { add } = useCart()

  const [selectedSize, setSelectedSize] = useState(null)
  const [sizeError, setSizeError] = useState(false)
  const [adding, setAdding] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const { isSaved, toggle } = useWardrobe()
  const wishlisted = isSaved(product.id)
  const [copied, setCopied] = useState(false)
  const [bagMessage, setBagMessage] = useState('')
  const [detailsExpanded, setDetailsExpanded] = useState(false)
  const [shippingExpanded, setShippingExpanded] = useState(false)
  const [packagingExpanded, setPackagingExpanded] = useState(false)
  const [returnExpanded, setReturnExpanded] = useState(false)
  // Stacked vertically images
  const displayImages = []
  if (product.images && product.images.length > 0) {
    product.images.forEach(img => {
      displayImages.push(typeof img === 'string' ? img : img.url)
    })
  }

  // Get active size options from product variants
  const availableSizes = [...new Set(product.variants?.map(v => v.size.toUpperCase()) || [])].sort((a, b) => ['XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL'].indexOf(a) - ['XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL'].indexOf(b))
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

  function selectedVariant() {
    return product.variants?.find(v => v.size.toUpperCase() === selectedSize?.toUpperCase() && v.stockQty > 0)
  }
  async function addSelected() {
    const variant = selectedVariant()
    if (!variant) { setSizeError(true); return false }
    setSizeError(false)
    return add({ ...variant, product: { name: product.name, slug: product.slug, description: product.description, fabric: product.fabric, care: product.care, images: product.images }, images: product.images }, 1)
  }
  const handleAddToBag = async () => {
    setAdding(true)
    try { if (await addSelected()) setBagMessage(`Size ${selectedSize} has been added to your bag.`) }
    finally { setAdding(false) }
  }
  const handleFastCheckout = async () => {
    setCheckoutLoading(true)
    try { if (await addSelected()) router.push(session ? '/checkout' : '/?login=true&next=%2Fcheckout') }
    finally { setCheckoutLoading(false) }
  }
  async function handleWardrobe() {
    if (await toggle(product.id) === 'login-required') router.push(`/?login=true&next=${encodeURIComponent(`/products/${product.slug}`)}`)
  }

  return (
    <>


      <div 
        className="w-full max-w-none pl-6 pr-0 md:pl-12 md:pr-0 pb-24"
        style={{ paddingTop: '0px' }}
      >
        <div className="flex flex-col lg:flex-row items-start justify-between gap-16 lg:gap-12">
          
          {/* Left Column — Stacked Image Gallery */}
          <div className="w-full lg:w-[53%] flex flex-col gap-0">
            {displayImages.map((imgUrl, i) => (
              <div 
                key={i}
                className="w-full overflow-hidden relative"
                style={{ width: '100%', marginBottom: '0' }}
              >
                <Image
                  width={1200} height={1500} sizes="(max-width: 1023px) 100vw, 53vw" loading={i === 0 ? "eager" : "lazy"}
                  src={imgUrl}
                  alt={`${product.name} view ${i + 1}`}
                  className="w-full h-auto block"
                />

                {/* Circular Hanger Wishlist button on first image */}
                {i === 0 && (
                  <button
                    onClick={handleWardrobe}
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
                    <Image
                      width={24} height={24}
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
                )}
              </div>
            ))}
          </div>

          {/* Right Column — Sticky Product Info */}
          <div 
            className="w-full lg:w-[44%] flex flex-col gap-6 bg-white lg:sticky lg:top-[56px]"
            style={{ paddingTop: 'var(--space-5)', paddingLeft: '48px', paddingRight: '48px' }} // 48px top padding on the info column
          >
            
            {/* Section 1: SKU & Share */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] tracking-widest text-zinc-400 uppercase font-medium">
                SKU: {(selectedVariant() || product.variants?.[0])?.sku || 'BIA-LNN-01'}
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
                {formatPrice(selectedVariant()?.price || product.variants?.[0]?.price || 0)}
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
                    <Image
                      width={40} height={40}
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
                      aria-pressed={isSelected}
                      onClick={() => {
                        setSelectedSize(size)
                        setSizeError(false)
                        setBagMessage('')
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

            {bagMessage && <p role="status" style={{ fontSize: 13, margin: "12px 0" }}>{bagMessage} <Link href="/cart" style={{ textDecoration: "underline" }}>View bag</Link></p>}

            {/* VIEW DETAILS link */}
            <button
              onClick={() => {
                document.getElementById('description-section')?.scrollIntoView({ behavior: 'smooth' })
              }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '12px 0', fontSize: '13px', fontWeight: 400, color: '#262626', letterSpacing: '1px', fontFamily: 'var(--font-ui)', textDecoration: 'underline', textAlign: 'left' }}
            >
              + VIEW DETAILS
            </button>

            {/* Section 6: Action Buttons */}
            <div className="flex flex-col pt-4" style={{ gap: '12px' }}>
              <button
                onClick={handleAddToBag}
                disabled={adding}
                className="w-full text-sm tracking-widest uppercase transition-colors flex items-center justify-center gap-2 font-medium"
                style={{
                  background: 'var(--black)',
                  color: 'var(--bg)',
                  fontFamily: 'var(--font-ui)',
                  width: '100%',
                  height: '48px',
                  padding: '11px 33px',
                  letterSpacing: '4px',
                  textTransform: 'uppercase',
                }}
              >
                {/* Button text comes from the admin panel */}
                {adding ? 'ADDING...' : (pdpSettings.addToBagText || 'ADD TO BAG')}
              </button>

              {/* Fast checkout can be switched off from the admin panel */}
              {pdpSettings.showFastCheckout !== false && (
                <button
                  onClick={handleFastCheckout}
                  disabled={checkoutLoading}
                  className="w-full text-sm tracking-widest uppercase border transition-colors flex items-center justify-center gap-2 text-white hover:bg-opacity-95 font-medium"
                  style={{
                    background: '#1c2c54',
                    borderColor: '#1c2c54',
                    fontFamily: 'var(--font-ui)',
                    width: '100%',
                    height: '48px',
                    padding: '11px 33px',
                    letterSpacing: '4px',
                    textTransform: 'uppercase',
                  }}
                >
                  {checkoutLoading ? 'OPENING CHECKOUT...' : 'CHECKOUT'}
                </button>
              )}
              
              <div className="text-center" style={{ marginTop: '16px' }}>
                <span className="text-[10px] tracking-widest text-zinc-500 uppercase font-medium">
                  Free shipping at ₹3,000 · 14-day returns
                </span>
              </div>
            </div>

          </div>
        </div>

        {/* Full-width Description Section */}
        <div id="description-section" style={{ paddingTop: '26px', paddingLeft: '125px', paddingRight: '125px' }} className="w-full mt-12 hidden lg:block">
          {/* Top area: two columns side by side */}
          <div className="flex flex-row w-full mb-12">
            <div className="w-full md:w-1/2" style={{ padding: '0 15px' }}>
              <h2 style={{ fontSize: '32px', fontWeight: 500, color: '#262626', marginBottom: '16px', fontFamily: 'var(--font-display)' }}>DESCRIPTION</h2>
              <p style={{ fontSize: '16px', fontWeight: 300, lineHeight: '20px', color: '#6f6f6f', letterSpacing: '0.6px', marginBottom: '24px', fontFamily: 'var(--font-ui)' }}>
                {product.description || 'Crafted with premium Indian linen, this clothing piece combines breathability with architectural silhouette lines. Designed for effortless transitions from morning to evening settings.'}
              </p>
            </div>
            <div className="w-full md:w-1/2" style={{ padding: '0 15px' }}>
              <h2 style={{ fontSize: '32px', fontWeight: 500, color: '#262626', marginBottom: '16px', fontFamily: 'var(--font-display)' }}>MATERIALS</h2>
              <p style={{ fontSize: '16px', fontWeight: 300, lineHeight: '20px', color: '#6f6f6f', letterSpacing: '0.6px', marginBottom: '24px', fontFamily: 'var(--font-ui)' }}>
                {product.fabric || 'Please contact us for fabric details.'}
                <br/><br/>
                Our items are manufactured in limited artisanal batches in India, respecting local craft traditions and community development.
              </p>
            </div>
          </div>

          {/* Below the two columns: DETAILS accordion */}
          <div className="w-full relative" style={{ borderTop: '1px solid #D2D2D2' }}>
            <button 
              aria-expanded={detailsExpanded}
              onClick={() => setDetailsExpanded(!detailsExpanded)}
              className="w-full text-left relative flex items-center hover:opacity-60 transition-opacity"
              style={{ height: '56px', padding: '16px 30px 16px 0', fontSize: '18px', fontWeight: 400, color: '#262626', fontFamily: 'var(--font-display)' }}
            >
              DETAILS
              <div style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)' }}>
                {detailsExpanded ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                )}
              </div>
            </button>
            <div aria-hidden={!detailsExpanded} inert={!detailsExpanded}
              style={{
                maxHeight: detailsExpanded ? '1000px' : '0', 
                overflow: detailsExpanded ? 'visible' : 'hidden', 
                transition: '0.15s ease-in' 
              }}
            >
              <div style={{ paddingBottom: '24px', paddingLeft: '15px', paddingRight: '15px' }}>
                <p style={{ fontSize: '16px', fontWeight: 300, lineHeight: '20px', color: '#6f6f6f', letterSpacing: '0.6px', fontFamily: 'var(--font-ui)' }}>
                  {product.description}
                  {product.care && <><br /><br />Care: {product.care}</>}
                </p>
              </div>
            </div>
          </div>

          <PdpAccordion
            title="PACKAGING"
            open={packagingExpanded}
            onToggle={() => setPackagingExpanded(!packagingExpanded)}
            desktop={true}
          >
              <>
                Every order is packed in reusable cotton cloth and recycled paper — no plastic anywhere in the parcel.
                <br/><br/>
                The outer box is FSC-certified and designed to be flattened and stored, so it can be reused for a return or kept for another use.
              </>
          </PdpAccordion>

          {/* SHIPPING AND RETURNS accordion */}
          <div className="w-full relative" style={{ borderTop: '1px solid #D2D2D2' }}>
            <button 
              aria-expanded={shippingExpanded}
              onClick={() => setShippingExpanded(!shippingExpanded)}
              className="w-full text-left relative flex items-center hover:opacity-60 transition-opacity"
              style={{ height: '56px', padding: '16px 30px 16px 0', fontSize: '18px', fontWeight: 400, color: '#262626', fontFamily: 'var(--font-display)' }}
            >
              SHIPPING AND RETURNS
              <div style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)' }}>
                {shippingExpanded ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                )}
              </div>
            </button>
            <div aria-hidden={!shippingExpanded} inert={!shippingExpanded}
              style={{
                maxHeight: shippingExpanded ? '1000px' : '0',
                overflow: shippingExpanded ? 'visible' : 'hidden', 
                transition: '0.15s ease-in' 
              }}
            >
              <div style={{ paddingBottom: '24px', paddingLeft: '15px', paddingRight: '15px' }}>
                <p style={{ fontSize: '16px', fontWeight: 300, lineHeight: '20px', color: '#6f6f6f', letterSpacing: '0.6px', marginBottom: '8px', fontFamily: 'var(--font-ui)' }}>
                  <strong style={{ color: '#262626', fontWeight: 500 }}>Shipping:</strong> {STORE_POLICY.shipping}
                </p>
                <p style={{ fontSize: '16px', fontWeight: 300, lineHeight: '20px', color: '#6f6f6f', letterSpacing: '0.6px', fontFamily: 'var(--font-ui)' }}>
                  <strong style={{ color: '#262626', fontWeight: 500 }}>Returns:</strong> {STORE_POLICY.returns}
                </p>
              </div>
            </div>
          </div>
          <PdpAccordion
            title="METHOD OF RETURN"
            open={returnExpanded}
            onToggle={() => setReturnExpanded(!returnExpanded)}
            desktop={true}
          >
              <>
                You have 14 days from the delivery date to request a return or exchange. Pieces must be unworn, unwashed and in their original condition with tags attached.
                <br/><br/>
                Write to us with your order number to arrange a pickup where available. <Link href="/returns" className="underline">Read the returns policy.</Link>
              </>
          </PdpAccordion>

        </div>

        {/* Mobile Description Section (No horizontal padding constraints) */}
        <div className="w-full mt-12 block lg:hidden" style={{ paddingLeft: '24px', paddingRight: '24px' }}>
           <div className="flex flex-col w-full mb-8 gap-8">
            <div className="w-full">
              <h2 style={{ fontSize: '24px', fontWeight: 500, color: '#262626', marginBottom: '12px', fontFamily: 'var(--font-display)' }}>DESCRIPTION</h2>
              <p style={{ fontSize: '15px', fontWeight: 300, lineHeight: '22px', color: '#6f6f6f', letterSpacing: '0.5px', fontFamily: 'var(--font-ui)' }}>
                {product.description || 'Crafted with premium Indian linen, this clothing piece combines breathability with architectural silhouette lines. Designed for effortless transitions from morning to evening settings.'}
              </p>
            </div>
            <div className="w-full">
              <h2 style={{ fontSize: '24px', fontWeight: 500, color: '#262626', marginBottom: '12px', fontFamily: 'var(--font-display)' }}>MATERIALS</h2>
              <p style={{ fontSize: '15px', fontWeight: 300, lineHeight: '22px', color: '#6f6f6f', letterSpacing: '0.5px', fontFamily: 'var(--font-ui)' }}>
                {product.fabric || 'Please contact us for fabric details.'}
              </p>
            </div>
          </div>

          <div className="w-full relative" style={{ borderTop: '1px solid #D2D2D2' }}>
            <button 
              aria-expanded={detailsExpanded}
              onClick={() => setDetailsExpanded(!detailsExpanded)}
              className="w-full text-left relative flex items-center"
              style={{ height: '56px', padding: '16px 30px 16px 0', fontSize: '16px', fontWeight: 400, color: '#262626', fontFamily: 'var(--font-display)' }}
            >
              DETAILS
              <div style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)' }}>
                {detailsExpanded ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                )}
              </div>
            </button>
            <div aria-hidden={!detailsExpanded} inert={!detailsExpanded} style={{ maxHeight: detailsExpanded ? '1000px' : '0', overflow: detailsExpanded ? 'visible' : 'hidden', transition: '0.15s ease-in' }}>
              <div style={{ paddingBottom: '24px' }}>
                <p style={{ fontSize: '15px', fontWeight: 300, lineHeight: '22px', color: '#6f6f6f', fontFamily: 'var(--font-ui)' }}>
                  {product.description}
                  {product.care && <><br /><br />Care: {product.care}</>}
                </p>
              </div>
            </div>
          </div>

          <PdpAccordion
            title="PACKAGING"
            open={packagingExpanded}
            onToggle={() => setPackagingExpanded(!packagingExpanded)}
            desktop={false}
          >
              <>
                Every order is packed in reusable cotton cloth and recycled paper — no plastic anywhere in the parcel.
                <br/><br/>
                The outer box is FSC-certified and designed to be flattened and stored, so it can be reused for a return or kept for another use.
              </>
          </PdpAccordion>

          <div className="w-full relative" style={{ borderTop: '1px solid #D2D2D2' }}>
            <button 
              aria-expanded={shippingExpanded}
              onClick={() => setShippingExpanded(!shippingExpanded)}
              className="w-full text-left relative flex items-center"
              style={{ height: '56px', padding: '16px 30px 16px 0', fontSize: '16px', fontWeight: 400, color: '#262626', fontFamily: 'var(--font-display)' }}
            >
              SHIPPING AND RETURNS
              <div style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)' }}>
                {shippingExpanded ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                )}
              </div>
            </button>
            <div aria-hidden={!shippingExpanded} inert={!shippingExpanded} style={{ maxHeight: shippingExpanded ? '1000px' : '0', overflow: shippingExpanded ? 'visible' : 'hidden', transition: '0.15s ease-in' }}>
              <div style={{ paddingBottom: '24px' }}>
                <p style={{ fontSize: '15px', fontWeight: 300, lineHeight: '22px', color: '#6f6f6f', marginBottom: '8px', fontFamily: 'var(--font-ui)' }}>
                  <strong style={{ color: '#262626', fontWeight: 500 }}>Shipping:</strong> {STORE_POLICY.shipping}
                </p>
                <p style={{ fontSize: '15px', fontWeight: 300, lineHeight: '22px', color: '#6f6f6f', fontFamily: 'var(--font-ui)' }}>
                  <strong style={{ color: '#262626', fontWeight: 500 }}>Returns:</strong> {STORE_POLICY.returns}
                </p>
              </div>
            </div>
          </div>
          <PdpAccordion
            title="METHOD OF RETURN"
            open={returnExpanded}
            onToggle={() => setReturnExpanded(!returnExpanded)}
            desktop={false}
          >
              <>
                You have 14 days from the delivery date to request a return or exchange. Pieces must be unworn, unwashed and in their original condition with tags attached.
                <br/><br/>
                Write to us with your order number to arrange a pickup where available. <Link href="/returns" className="underline">Read the returns policy.</Link>
              </>
          </PdpAccordion>

        </div>
      </div>
    </>
  )
}

// Collapsible section under the PDP images. The client's spec keeps
// DESCRIPTION and MATERIALS open and these ones closed by default.
function PdpAccordion({ title, open, onToggle, desktop, children }) {
  return (
    <div className="w-full relative" style={{ borderTop: '1px solid #D2D2D2' }}>
      <button
        aria-expanded={open}
        onClick={onToggle}
        className="w-full text-left relative flex items-center hover:opacity-60 transition-opacity"
        style={{ height: '56px', padding: '16px 30px 16px 0', fontSize: desktop ? '18px' : '16px', fontWeight: 400, color: '#262626', fontFamily: 'var(--font-display)' }}
      >
        {title}
        <div style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            {!open && <line x1="12" y1="5" x2="12" y2="19"></line>}
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </div>
      </button>
      <div aria-hidden={!open} inert={!open} style={{ maxHeight: open ? '1000px' : '0', overflow: open ? 'visible' : 'hidden', transition: '0.15s ease-in' }}>
        <div style={{ paddingBottom: '24px', paddingLeft: desktop ? '15px' : 0, paddingRight: desktop ? '15px' : 0 }}>
          <p style={{ fontSize: desktop ? '16px' : '15px', fontWeight: 300, lineHeight: desktop ? '20px' : '22px', color: '#6f6f6f', letterSpacing: desktop ? '0.6px' : 'normal', fontFamily: 'var(--font-ui)' }}>
            {children}
          </p>
        </div>
      </div>
    </div>
  )
}
