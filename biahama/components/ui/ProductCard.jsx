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
      <div className="relative overflow-hidden" style={{ aspectRatio: '4/5', background: 'var(--light)' }}>
        {imagesToCycle.length > 0 ? (
          <Image
            src={imagesToCycle[currentImageIndex]}
            alt={product.altText || product.name}
            fill
            sizes="(max-width: 768px) 50vw, 33vw"
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
              style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 300, fontStyle: 'italic', color: 'var(--border)', opacity: 0.6 }}
            >
              {product.category}
            </span>
          </div>
        )}

        {/* Category Badge overlay top-left */}
        <div className="absolute top-3 left-3 bg-white/80 backdrop-blur-[2px] px-2 py-0.5" style={{ border: '1px solid var(--border)' }}>
          <span
            className="text-[9px] tracking-widest uppercase font-medium"
            style={{ color: 'var(--black)', fontFamily: 'Jost, sans-serif' }}
          >
            {product.category}
          </span>
        </div>

        {/* Badges */}
        {isSoldOut && (
          <div className="absolute top-3 left-3 mt-7">
            <span className="text-[10px] tracking-widest uppercase px-2 py-1" style={{ background: 'var(--gray)', color: 'var(--white)', fontFamily: 'Jost, sans-serif' }}>
              Sold Out
            </span>
          </div>
        )}
        {isLowStock && !isSoldOut && (
          <div className="absolute top-3 left-3 mt-7">
            <span className="text-[10px] tracking-widest uppercase px-2 py-1" style={{ background: 'var(--black)', color: 'var(--white)', fontFamily: 'Jost, sans-serif' }}>
              Only {product.stockQty} left
            </span>
          </div>
        )}

        {/* Wardrobe button — always visible */}
        <button
          onClick={e => { e.preventDefault(); e.stopPropagation(); setWishlisted(w => !w) }}
          className="absolute top-3 right-3 z-10"
          aria-label="Save to wardrobe"
        >
          <div
            className="w-8 h-8 flex items-center justify-center rounded-full"
            style={{ background: wishlisted ? 'var(--black)' : 'rgba(255,255,255,0.9)', border: '1px solid var(--border)' }}
          >
            <HangerIcon color={wishlisted ? 'var(--white)' : 'var(--black)'} />
          </div>
        </button>
      </div>

      {/* Info */}
      <div className="mt-3 flex justify-between items-start gap-4">
        <div className="space-y-1 flex-1">
          <p className="text-[10px] tracking-wide" style={{ color: 'var(--gray)', fontFamily: 'Jost, sans-serif', fontWeight: 300, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            {product.category}
          </p>
          <div className="flex justify-between items-start gap-2">
            <p className="text-sm font-medium" style={{ color: 'var(--black)', fontFamily: 'Jost, sans-serif', fontWeight: 400 }}>
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
                  style={{ width: '18px', height: '18px', objectFit: 'contain' }}
                />
              </button>
            )}
          </div>
          <p className="text-sm font-bold" style={{ color: 'var(--black)', fontFamily: 'Jost, sans-serif', fontWeight: 600 }}>
            {isSoldOut ? 'Sold Out' : formatPrice(product.price)}
          </p>
        </div>
      </div>
    </Link>
  )
}

function HangerIcon({ color = 'currentColor' }) {
  const isInverted = color === 'var(--white)' || color === '#ffffff'
  return (
    <img
      src="/cloth-hanger.png"
      alt="Hanger"
      style={{
        width: '14px',
        height: '14px',
        objectFit: 'contain',
        filter: isInverted ? 'invert(1)' : 'none',
      }}
    />
  )
}
