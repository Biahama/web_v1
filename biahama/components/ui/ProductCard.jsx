'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useCart } from '@/lib/cart'

function formatPrice(paise) {
  return `₹${(paise / 100).toLocaleString('en-IN')}`
}

export default function ProductCard({ product, priority = false }) {
  const [wishlisted, setWishlisted] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const { add } = useCart()

  const isLowStock = product.stockQty <= 3 && product.stockQty > 0
  const isSoldOut  = !product.inStock

  const imagesToCycle = product.images?.map(img => typeof img === 'string' ? img : img.url) || (product.image ? [product.image] : [])

  useEffect(() => {
    if (!hovered || imagesToCycle.length <= 1) {
      setCurrentImageIndex(0)
    }
  }, [hovered, imagesToCycle])

  const handleAddToCart = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (isSoldOut || !product.firstVariantId) return

    const activeVariant = product.variants?.find(v => v.stockQty > 0) || product.variants?.[0]
    if (activeVariant) {
      await add({
        id: activeVariant.id,
        price: activeVariant.price,
        size: activeVariant.size,
        color: activeVariant.color,
        product: {
          name: product.name,
          slug: product.slug,
        }
      }, 1)
      alert(`${product.name} has been added to your bag.`)
    }
  }

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group block"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Image container */}
      <div className="relative biahama-card-image overflow-hidden" style={{ background: '#ffffff' }}>
        {imagesToCycle.length > 0 ? (
          <>
            <img
              src={imagesToCycle[currentImageIndex]}
              alt={product.altText || product.name}
              className="w-full h-auto block"
              style={{
                transform: hovered ? 'scale(1.04)' : 'scale(1)',
                transition: 'transform 700ms cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            />
            {imagesToCycle.length > 1 && (
              <>
                {/* Prev Arrow */}
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setCurrentImageIndex(idx => (idx - 1 + imagesToCycle.length) % imagesToCycle.length)
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  style={{
                    position: 'absolute',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.7)',
                    border: 'none',
                    zIndex: 10,
                    left: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                  aria-label="Previous image"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#262626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </button>

                {/* Next Arrow */}
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setCurrentImageIndex(idx => (idx + 1) % imagesToCycle.length)
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  style={{
                    position: 'absolute',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.7)',
                    border: 'none',
                    zIndex: 10,
                    right: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                  aria-label="Next image"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#262626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              </>
            )}
          </>
        ) : (
          <div
            className="absolute inset-0 flex items-end p-4"
            style={{ background: '#ffffff' }}
          >
            <span
              className="text-4xl leading-none"
              style={{ fontFamily: 'var(--font-display)', fontWeight: 300, fontStyle: 'italic', color: 'var(--border)', opacity: 0.6 }}
            >
              {product.category}
            </span>
          </div>
        )}

        {/* Wardrobe button — always visible */}
        <button
          onClick={e => { e.preventDefault(); e.stopPropagation(); setWishlisted(w => !w) }}
          className="biahama-hanger-btn z-10 transition-colors"
          aria-label="Save to wardrobe"
          style={{
            width: 'var(--icon-hanger-btn)',
            height: 'var(--icon-hanger-btn)',
            borderRadius: '50%',
            background: 'var(--icon-hanger-btn-bg)',
            position: 'absolute',
            top: '8px',
            right: '8px',
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

      {/* Info */}
      <div style={{ marginTop: '3px' }} className="flex justify-between items-start">
        <div className="flex-1" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
          <div className="flex justify-between items-start" style={{ gap: 'var(--space-1)' }}>
            <p 
              className="biahama-product-name"
              style={{
                fontSize: 'var(--text-product-name-size)',
                letterSpacing: 'var(--text-product-name-tracking)',
              }}
            >
              {product.name}
            </p>
            {/* Shopping bag button using bag.png */}
            {!isSoldOut && (
              <button
                onClick={handleAddToCart}
                className="biahama-bag-btn hover:opacity-75 transition-opacity z-10 shrink-0 mt-0.5"
                aria-label="Add to cart"
                style={{
                  width: 'var(--icon-bag-container)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <img
                  src="/bag.png"
                  alt="Add to cart"
                  style={{
                    width: 'var(--icon-bag)',
                    height: 'var(--icon-bag)',
                    objectFit: 'contain'
                  }}
                />
              </button>
            )}
          </div>
          <p 
            className="biahama-price"
            style={{
              fontWeight: 'var(--text-price-weight)',
              letterSpacing: 'var(--text-price-tracking)',
            }}
          >
            {isSoldOut ? 'Sold Out' : formatPrice(product.price)}
          </p>
        </div>
      </div>
    </Link>
  )
}

