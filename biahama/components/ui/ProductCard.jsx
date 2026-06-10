'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useCart } from '@/lib/cart'

function formatPrice(paise) {
  return `₹${(paise / 100).toLocaleString('en-IN')}`
}

export default function ProductCard({ product, priority = false }) {
  const [wishlisted, setWishlisted] = useState(false)
  const [hovered, setHovered] = useState(false)
  const { add } = useCart()

  const isLowStock = product.stockQty <= 3 && product.stockQty > 0
  const isSoldOut  = !product.inStock

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
        {product.image ? (
          <Image
            src={product.image}
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

        {/* Wardrobe button — appears on hover */}
        <button
          onClick={e => { e.preventDefault(); e.stopPropagation(); setWishlisted(w => !w) }}
          className="absolute top-3 right-3 transition-opacity duration-200 z-10"
          style={{ opacity: hovered ? 1 : 0 }}
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
        <div className="space-y-1">
          <p className="text-[10px] tracking-wide" style={{ color: 'var(--gray)', fontFamily: 'Jost, sans-serif', fontWeight: 300, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            {product.category}
          </p>
          <p className="text-sm font-medium" style={{ color: 'var(--black)', fontFamily: 'Jost, sans-serif', fontWeight: 400 }}>
            {product.name}
          </p>
          <p className="text-sm font-bold" style={{ color: 'var(--black)', fontFamily: 'Jost, sans-serif', fontWeight: 600 }}>
            {isSoldOut ? 'Sold Out' : formatPrice(product.price)}
          </p>
        </div>

        {/* Shopping bag button */}
        {!isSoldOut && (
          <button
            onClick={handleAddToCart}
            className="p-2 border border-transparent hover:border-zinc-200 transition-colors bg-zinc-50 hover:bg-zinc-100 z-10 rounded"
            aria-label="Add to cart"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--black)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
          </button>
        )}
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
