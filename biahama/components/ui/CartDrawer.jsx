'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect } from 'react'
import { useCart } from '@/lib/cart'

function formatPrice(paise) {
  return `₹${(paise / 100).toLocaleString('en-IN')}`
}

export default function CartDrawer({ open, onClose }) {
  const { items, remove, updateQty } = useCart()
  const subtotal = items.reduce((s, i) => s + i.variant.price * i.quantity, 0)

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // Lock body scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 40,
          background: 'rgba(0,0,0,0.2)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 0.3s ease',
        }}
      />

      {/* Drawer */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          zIndex: 50,
          width: 420,
          maxWidth: '100vw',
          background: 'var(--bg)',
          boxShadow: '-4px 0 24px rgba(0,0,0,0.08)',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.32s cubic-bezier(0.4,0,0.2,1)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 32px',
          borderBottom: '1px solid #ddd9d3',
          flexShrink: 0,
        }}>
          <span style={{
            fontFamily: 'var(--font-jost)',
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--black)',
          }}>
            Cart
          </span>
          <button
            onClick={onClose}
            style={{
              fontFamily: 'var(--font-jost)',
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: '#8a8480',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            CLOSE ×
          </button>
        </div>

        {/* Content */}
        {items.length === 0 ? (
          /* Empty state */
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '32px',
            textAlign: 'center',
          }}>
            <p style={{
              fontFamily: 'var(--font-cormorant)',
              fontSize: 18,
              fontStyle: 'italic',
              fontWeight: 300,
              color: '#8a8480',
              marginBottom: 16,
            }}>
              Your wardrobe is empty.
            </p>
            <Link
              href="/shop"
              onClick={onClose}
              style={{
                display: 'inline-block',
                fontFamily: 'var(--font-jost)',
                fontSize: 10,
                fontWeight: 500,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                background: 'var(--black)',
                color: 'var(--white)',
                padding: '12px 24px',
                textDecoration: 'none',
                marginTop: 0,
              }}
            >
              Explore the Collection →
            </Link>
          </div>
        ) : (
          <>
            {/* Items list */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '32px',
            }}>
              {items.map(({ variantId, variant, quantity }) => (
                <div
                  key={variantId}
                  style={{
                    display: 'flex',
                    gap: 16,
                    paddingBottom: 24,
                    marginBottom: 24,
                    borderBottom: '1px solid #ddd9d3',
                  }}
                >
                  {/* Product image */}
                  <div style={{
                    width: 80,
                    height: 100,
                    flexShrink: 0,
                    background: 'var(--light)',
                    overflow: 'hidden',
                    position: 'relative',
                  }}>
                    {variant.images?.[0]?.url ? (
                      <Image
                        src={variant.images[0].url}
                        alt={variant.product?.name || ''}
                        fill
                        style={{ objectFit: 'cover' }}
                        sizes="80px"
                      />
                    ) : null}
                  </div>

                  {/* Details */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <p style={{
                        fontFamily: 'var(--font-jost)',
                        fontSize: 12,
                        color: 'var(--black)',
                        letterSpacing: '0.03em',
                        marginBottom: 4,
                      }}>
                        {variant.product?.name}
                      </p>
                      <p style={{
                        fontFamily: 'var(--font-jost)',
                        fontSize: 11,
                        color: '#8a8480',
                        letterSpacing: '0.04em',
                      }}>
                        {variant.size} · {variant.color}
                      </p>
                    </div>

                    {/* Qty controls + price */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
                      {/* Qty stepper */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <button
                          onClick={() => updateQty(variantId, quantity - 1)}
                          style={{
                            width: 24,
                            height: 24,
                            border: '1px solid #ddd9d3',
                            background: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontFamily: 'var(--font-jost)',
                            fontSize: 14,
                            color: 'var(--black)',
                          }}
                        >
                          −
                        </button>
                        <span style={{
                          fontFamily: 'var(--font-jost)',
                          fontSize: 12,
                          color: 'var(--black)',
                          minWidth: 16,
                          textAlign: 'center',
                        }}>
                          {quantity}
                        </span>
                        <button
                          onClick={() => updateQty(variantId, quantity + 1)}
                          style={{
                            width: 24,
                            height: 24,
                            border: '1px solid #ddd9d3',
                            background: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontFamily: 'var(--font-jost)',
                            fontSize: 14,
                            color: 'var(--black)',
                          }}
                        >
                          +
                        </button>
                      </div>

                      {/* Price */}
                      <span style={{
                        fontFamily: 'var(--font-jost)',
                        fontSize: 12,
                        color: 'var(--black)',
                        letterSpacing: '0.03em',
                      }}>
                        {formatPrice(variant.price * quantity)}
                      </span>
                    </div>

                    {/* Remove */}
                    <button
                      onClick={() => remove(variantId)}
                      style={{
                        alignSelf: 'flex-start',
                        marginTop: 8,
                        fontFamily: 'var(--font-jost)',
                        fontSize: 10,
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        color: '#8a8480',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer — pinned to bottom */}
            <div style={{
              flexShrink: 0,
              borderTop: '1px solid #ddd9d3',
              padding: '24px 32px',
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
              }}>
                <span style={{
                  fontFamily: 'var(--font-jost)',
                  fontSize: 11,
                  letterSpacing: '0.10em',
                  textTransform: 'uppercase',
                  color: '#8a8480',
                }}>
                  Subtotal
                </span>
                <span style={{
                  fontFamily: 'var(--font-jost)',
                  fontSize: 13,
                  color: 'var(--black)',
                  letterSpacing: '0.03em',
                }}>
                  {formatPrice(subtotal)}
                </span>
              </div>
              <Link
                href="/cart"
                onClick={onClose}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '16px 0',
                  textAlign: 'center',
                  fontFamily: 'var(--font-jost)',
                  fontSize: 11,
                  fontWeight: 500,
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  background: 'var(--black)',
                  color: 'var(--white)',
                  textDecoration: 'none',
                }}
              >
                Proceed to Checkout
              </Link>
            </div>
          </>
        )}
      </div>
    </>
  )
}
