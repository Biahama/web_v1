'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, usePathname } from 'next/navigation'
import { useWardrobe } from '@/lib/wardrobe'

function formatPrice(paise) {
  return `₹${(paise / 100).toLocaleString('en-IN')}`
}

export default function ProductCard({ product, priority = false }) {
  const router = useRouter()
  const pathname = usePathname()
  const [hovered, setHovered] = useState(false)
  // Wardrobe = saved items. Shared state, so the hanger stays
  // filled everywhere once a product is saved.
  const { isSaved, toggle } = useWardrobe()
  const wishlisted = isSaved(product.id)

  async function handleWardrobe(e) {
    e.preventDefault()
    e.stopPropagation()
    const result = await toggle(product.id)
    if (result === 'login-required') {
      // Not logged in — send them to the homepage with the login drawer open.
      router.push(`/?login=true&next=${encodeURIComponent(pathname)}`)
    }
  }

  const isSoldOut  = !product.inStock

  const imagesToCycle = product.images?.map(img => typeof img === 'string' ? img : img.url) || (product.image ? [product.image] : [])

  return (
    <div
      className="group block"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)} onBlur={() => setHovered(false)}
    >
      {/* Image container */}
      <div className="relative w-full overflow-hidden" style={{ width: '100%' }}>
        <Link href={`/products/${product.slug}`} aria-label={`View ${product.name}`} style={{ display: "block", aspectRatio: "4 / 5" }}>
        {imagesToCycle.length > 0 ? (
          <>
            <Image
              width={1200} height={1500} sizes="(max-width: 767px) 50vw, 33vw"
              loading={priority ? 'eager' : 'lazy'}
              fetchPriority={priority ? 'high' : 'auto'}
              src={imagesToCycle[hovered && imagesToCycle.length > 1 ? 1 : 0]}
              alt={product.altText || product.name}
              className="w-full h-auto block"
              style={{
                width: '100%',
                height: 'auto',
                aspectRatio: '4/5', // listing image ratio per design spec (1200 x 1500)
                objectFit: 'cover',
                objectPosition: product.category?.toLowerCase() === 'shirts' || product.category?.toLowerCase() === 'shirt' ? '50% 50%' : '50% 15%',
                display: 'block',
                transform: hovered ? 'scale(1.04)' : 'scale(1)',
                transition: 'transform 700ms cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            />
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

        </Link>

        {/* Wardrobe button — always visible */}
        <button
          onClick={handleWardrobe}
          className="biahama-hanger-btn z-10 transition-colors"
          aria-label={wishlisted ? `Remove ${product.name} from wardrobe` : `Save ${product.name} to wardrobe`}
          aria-pressed={wishlisted}
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
      </div>

      {/* Info */}
      <div style={{ marginTop: '8px' }} className="flex justify-between items-start">
        <div className="flex-1" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
          <div className="flex justify-between items-center w-full" style={{ gap: '8px' }}>
            <Link href={`/products/${product.slug}`}
              className="biahama-product-name"
              style={{
                fontSize: 'var(--text-product-name-size)',
                letterSpacing: 'var(--text-product-name-tracking)',
                margin: 0
              }}
            >
              {product.name}
            </Link>
            {/* + quick-add button */}
            {!isSoldOut && (
              <Link
                href={`/products/${product.slug}`}
                className="hover:opacity-75 transition-opacity shrink-0 max-[1199px]:hidden min-[1200px]:flex flex-row items-start"
                aria-label={`Choose size for ${product.name}`}
                style={{
                  width: '18px',
                  height: '16px',
                  paddingRight: '2px',
                  background: 'transparent',
                  border: 'none',
                  marginLeft: 'auto'
                }}
              >
                {/* Smaller + icon (was 20px) so it sits subtly next to the
                    product name, like the reference design */}
                <Image
                  loading="lazy"
                  width={14} height={14}
                  src="/icons/plus.png"
                  alt="View sizes"
                  style={{
                    width: '14px',
                    height: '14px',
                    color: '#1A202C'
                  }}
                />
              </Link>
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
    </div>
  )
}
