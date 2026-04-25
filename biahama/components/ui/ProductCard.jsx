'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'

function formatPrice(paise) {
  return `₹${(paise / 100).toLocaleString('en-IN')}`
}

export default function ProductCard({ product, priority = false }) {
  const [wishlisted, setWishlisted] = useState(false)
  const [hovered, setHovered] = useState(false)

  const isLowStock = product.stockQty <= 3 && product.stockQty > 0
  const isSoldOut  = !product.inStock

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group block"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Image container */}
      <div className="relative overflow-hidden" style={{ aspectRatio: '3/4', background: 'var(--light)' }}>
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

        {/* Badges */}
        {isSoldOut && (
          <div className="absolute top-3 left-3">
            <span className="text-[10px] tracking-widest uppercase px-2 py-1" style={{ background: 'var(--gray)', color: 'var(--white)', fontFamily: 'Jost, sans-serif' }}>
              Sold Out
            </span>
          </div>
        )}
        {isLowStock && !isSoldOut && (
          <div className="absolute top-3 left-3">
            <span className="text-[10px] tracking-widest uppercase px-2 py-1" style={{ background: 'var(--black)', color: 'var(--white)', fontFamily: 'Jost, sans-serif' }}>
              Only {product.stockQty} left
            </span>
          </div>
        )}

        {/* Wardrobe button — appears on hover */}
        <button
          onClick={e => { e.preventDefault(); setWishlisted(w => !w) }}
          className="absolute top-3 right-3 transition-opacity duration-200"
          style={{ opacity: hovered ? 1 : 0 }}
          aria-label="Save to wardrobe"
        >
          <div
            className="w-8 h-8 flex items-center justify-center"
            style={{ background: wishlisted ? 'var(--black)' : 'rgba(240,237,232,0.9)', border: '1px solid var(--border)' }}
          >
            <HangerIcon color={wishlisted ? 'var(--white)' : 'var(--black)'} />
          </div>
        </button>
      </div>

      {/* Info */}
      <div className="mt-3 space-y-1">
        <p className="text-xs tracking-wide" style={{ color: 'var(--gray)', fontFamily: 'Jost, sans-serif', fontWeight: 300, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          {product.category}
        </p>
        <p className="text-sm" style={{ color: 'var(--black)', fontFamily: 'Jost, sans-serif', fontWeight: 300 }}>
          {product.name}
        </p>
        <p className="text-sm" style={{ color: 'var(--black)', fontFamily: 'Jost, sans-serif', fontWeight: 400 }}>
          {isSoldOut ? 'Sold Out' : formatPrice(product.price)}
        </p>

        {/* Color swatches */}
        {product.colors?.length > 0 && (
          <div className="flex gap-1.5 pt-1">
            {product.colors.slice(0, 5).map(({ color, colorHex }) => (
              <span
                key={color}
                title={color}
                className="rounded-full"
                style={{ width: 14, height: 14, background: colorHex || '#ccc', border: '1px solid rgba(0,0,0,0.1)' }}
              />
            ))}
          </div>
        )}
      </div>
    </Link>
  )
}

function HangerIcon({ color = 'currentColor' }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.38 3.46L16 2a4 4 0 01-8 0L3.62 3.46a2 2 0 00-1.34 2.23l.58 3.57a1 1 0 00.99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 002-2V10h2.15a1 1 0 00.99-.84l.58-3.57a2 2 0 00-1.34-2.23z" />
    </svg>
  )
}
