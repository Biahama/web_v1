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
      return
    }

    const interval = setInterval(() => {
      setCurrentImageIndex(idx => (idx + 1) % imagesToCycle.length)
    }, 2000)

    return () => clearInterval(interval)
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
      <div className="relative biahama-card-image" style={{ background: 'var(--light)' }}>
        {imagesToCycle.length > 0 ? (
          <Image
            src={imagesToCycle[currentImageIndex]}
            alt={product.altText || product.name}
            fill
            unoptimized
            className="object-cover transition-transform duration-700"
            style={{ transform: hovered ? 'scale(1.04)' : 'scale(1)' }}
            priority={priority}
          />
        ) : (
          <div
            className="absolute inset-0 flex items-end p-4"
            style={{ background: 'var(--light)' }}
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
          className="absolute top-3 right-3 z-10 p-1.5 rounded-full hover:bg-zinc-50/20 transition-colors"
          aria-label="Save to wardrobe"
        >
          <img
            src="/cloth-hanger.png"
            alt="Save to wardrobe"
            style={{
              width: 'var(--icon-wishlist-btn)',
              height: 'var(--icon-wishlist-btn)',
              objectFit: 'contain',
              opacity: wishlisted ? 1.0 : 0.6,
              filter: 'drop-shadow(0px 1px 2px rgba(255, 255, 255, 0.4))'
            }}
          />
        </button>
      </div>

      {/* Info */}
      <div style={{ marginTop: 'var(--card-image-margin-bottom)' }} className="flex justify-between items-start">
        <div className="flex-1" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
          <div className="flex justify-between items-start" style={{ gap: 'var(--space-1)' }}>
            <p className="biahama-product-name">
              {product.name}
            </p>
            {/* Shopping bag button using bag.png */}
            {!isSoldOut && (
              <button
                onClick={handleAddToCart}
                className="p-1 hover:opacity-75 transition-opacity z-10 shrink-0 mt-0.5"
                aria-label="Add to cart"
              >
                <img
                  src="/bag.png"
                  alt="Add to cart"
                  style={{
                    width: 'var(--icon-wishlist-btn)',
                    height: 'var(--icon-wishlist-btn)',
                    objectFit: 'contain'
                  }}
                />
              </button>
            )}
          </div>
          <p className="biahama-price">
            {isSoldOut ? 'Sold Out' : formatPrice(product.price)}
          </p>
        </div>
      </div>
    </Link>
  )
}

