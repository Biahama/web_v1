'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

function formatPrice(paise) {
  return `₹${(paise / 100).toLocaleString('en-IN')}`
}

const STATUS_LABELS = {
  pending:          'Order Pending',
  confirmed:        'Order Confirmed',
  processing:       'Processing',
  shipped:          'Shipped',
  delivered:        'Delivered',
  cancelled:        'Cancelled',
}

const SHIPPING_LABELS = {
  not_shipped:        'Awaiting shipment',
  pickup_scheduled:   'Pickup scheduled',
  picked_up:          'Picked up',
  in_transit:         'In transit',
  out_for_delivery:   'Out for delivery',
  delivered:          'Delivered',
  failed_delivery:    'Delivery failed',
  rto_initiated:      'Return initiated',
  rto_delivered:      'Returned to origin',
}

export default function OrderPage() {
  const { id } = useParams()
  const [order,   setOrder]   = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/orders/${id}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { setOrder(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontFamily: 'var(--font-jost)', fontSize: 13, color: 'var(--gray)', letterSpacing: '0.08em' }}>
        Loading order…
      </p>
    </div>
  )

  if (!order) return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 24 }}>
      <p style={{ fontFamily: 'var(--font-jost)', fontSize: 13, color: 'var(--gray)', letterSpacing: '0.05em' }}>
        Order not found.
      </p>
      <Link href="/shop" style={{ fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--black)' }}>
        Continue Shopping →
      </Link>
    </div>
  )

  const addr = order.shippingAddress

  return (
    <div style={{
      maxWidth: 720,
      margin: '0 auto',
      padding: '80px 48px',
      fontFamily: 'var(--font-jost)',
    }}>
      {/* Header */}
      <div style={{ marginBottom: 56 }}>
        <div style={{ width: 40, height: 1, background: 'var(--black)', marginBottom: 32 }} />

        <p style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--gray)', marginBottom: 12 }}>
          {order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Paid Online'} · #{id.slice(-8).toUpperCase()}
        </p>

        <h1 style={{
          fontFamily: 'var(--font-cormorant)',
          fontSize: 48,
          fontWeight: 300,
          fontStyle: 'italic',
          color: 'var(--black)',
          marginBottom: 8,
          letterSpacing: '0.02em',
          lineHeight: 1.1,
        }}>
          {order.status === 'confirmed' || order.status === 'processing'
            ? 'Thank you for your order.'
            : STATUS_LABELS[order.status] || 'Your order'}
        </h1>

        <p style={{ fontSize: 13, color: 'var(--gray)', letterSpacing: '0.03em', lineHeight: 1.6 }}>
          {order.paymentMethod === 'cod'
            ? 'Your order has been placed. Payment will be collected on delivery.'
            : "Your payment was successful. We’ll start preparing your order right away."}
        </p>
      </div>

      {/* Status + Tracking */}
      <div style={{
        padding: '24px 28px',
        border: '1px solid var(--border)',
        marginBottom: 40,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        flexWrap: 'wrap',
      }}>
        <div>
          <p style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--gray)', marginBottom: 6 }}>
            Order status
          </p>
          <p style={{ fontSize: 14, color: 'var(--black)', letterSpacing: '0.03em' }}>
            {STATUS_LABELS[order.status] || order.status}
          </p>
        </div>
        <div>
          <p style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--gray)', marginBottom: 6 }}>
            Shipping status
          </p>
          <p style={{ fontSize: 14, color: 'var(--black)', letterSpacing: '0.03em' }}>
            {SHIPPING_LABELS[order.shippingStatus] || 'Awaiting shipment'}
          </p>
        </div>
        {order.awbNumber && (
          <div>
            <p style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--gray)', marginBottom: 6 }}>
              Tracking number
            </p>
            <p style={{ fontSize: 14, color: 'var(--black)', letterSpacing: '0.03em', fontFamily: 'monospace' }}>
              {order.awbNumber}
            </p>
          </div>
        )}
      </div>

      {/* Items */}
      <div style={{ marginBottom: 40 }}>
        <p style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--gray)', marginBottom: 20 }}>
          Items ordered
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {order.items.map((item, i) => (
            <div key={item.id} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              padding: '16px 0',
              borderBottom: '1px solid var(--border)',
              gap: 16,
            }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, color: 'var(--black)', marginBottom: 4, letterSpacing: '0.02em' }}>
                  {item.productName}
                </p>
                <p style={{ fontSize: 12, color: 'var(--gray)', letterSpacing: '0.04em' }}>
                  {item.variantDetails?.size} · {item.variantDetails?.color} · Qty {item.quantity}
                </p>
              </div>
              <p style={{ fontSize: 13, color: 'var(--black)', letterSpacing: '0.03em', whiteSpace: 'nowrap' }}>
                {formatPrice(item.total)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Totals */}
      <div style={{
        padding: '24px 0',
        borderTop: '1px solid var(--border)',
        marginBottom: 40,
      }}>
        {[
          { label: 'Subtotal', value: order.totalAmount - order.shippingAmount - Math.round((order.totalAmount - order.shippingAmount) * (5/105)) },
          { label: 'Shipping', value: order.shippingAmount, zero: 'Free' },
          { label: 'GST (5%)', value: Math.round((order.totalAmount - order.shippingAmount) * (5/105)) },
        ].map(row => (
          <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 12, color: 'var(--gray)', letterSpacing: '0.04em' }}>{row.label}</span>
            <span style={{ fontSize: 12, color: 'var(--black)', letterSpacing: '0.03em' }}>
              {row.zero && row.value === 0 ? row.zero : formatPrice(row.value)}
            </span>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          <span style={{ fontSize: 13, color: 'var(--black)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Total</span>
          <span style={{ fontSize: 14, color: 'var(--black)', letterSpacing: '0.03em' }}>{formatPrice(order.totalAmount)}</span>
        </div>
      </div>

      {/* Delivery address */}
      {addr && (
        <div style={{ marginBottom: 48 }}>
          <p style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--gray)', marginBottom: 14 }}>
            Delivering to
          </p>
          <p style={{ fontSize: 13, color: 'var(--black)', lineHeight: 1.7, letterSpacing: '0.02em' }}>
            {addr.fullName}<br />
            {addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}<br />
            {addr.city}, {addr.state} – {addr.pincode}<br />
            {addr.phone}
          </p>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <Link href="/shop" style={{
          padding: '14px 28px',
          background: 'var(--black)',
          color: 'var(--white)',
          textDecoration: 'none',
          fontSize: 11,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
        }}>
          Continue Shopping
        </Link>
        <Link href="/account/orders" style={{
          padding: '14px 28px',
          background: 'transparent',
          color: 'var(--black)',
          border: '1px solid var(--border)',
          textDecoration: 'none',
          fontSize: 11,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
        }}>
          View All Orders
        </Link>
      </div>
    </div>
  )
}
