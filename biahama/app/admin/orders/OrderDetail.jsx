'use client'

// ============================================================
// The single-order screen: everything about one order, plus
// the buttons to move it along:
//   * change its status by hand
//   * type in a tracking number by hand
//   * or let Shiprocket do the shipping (3 buttons)
// Every button shows a green (success) or red (error) banner
// with the exact message from the server — nothing fails silently.
// ============================================================

import { useState } from 'react'
import { useRouter } from 'next/navigation'

// ---------- small shared styles (same look as the product form) ----------
const inputStyle = {
  width: '100%', padding: '8px 10px', border: '1px solid #cbd5e0',
  borderRadius: 4, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box',
}
const labelStyle = { display: 'block', fontSize: 13, color: '#4a5568', marginBottom: 4 }
const darkButton = {
  background: '#1A202C', color: '#fff', border: 'none', padding: '10px 18px',
  borderRadius: 4, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
}
const lightButton = {
  background: '#fff', color: '#1A202C', border: '1px solid #cbd5e0', padding: '10px 18px',
  borderRadius: 4, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
}
const sectionStyle = {
  border: '1px solid #e2e8f0', borderRadius: 8, padding: 20, marginBottom: 20,
}
const sectionTitle = { fontSize: 16, fontWeight: 500, margin: '0 0 16px 0' }

const STATUS_COLORS = {
  pending: '#4a5568',
  confirmed: '#1A202C',
  processing: '#b7791f',
  shipped: '#2b6cb0',
  delivered: '#276749',
  cancelled: '#cc0000',
}

function rupees(paise) {
  return '₹' + (paise / 100).toLocaleString('en-IN')
}

export default function OrderDetail({ order }) {
  const router = useRouter()
  const addr = order.shippingAddress || {}

  // ---------- form state ----------
  const [status, setStatus] = useState(order.status)
  const [awb, setAwb] = useState(order.awbNumber || '')
  const [partner, setPartner] = useState(order.shippingPartner || '')
  const [trackingText, setTrackingText] = useState('') // latest tracking status text

  // ---------- banner + busy state ----------
  const [banner, setBanner] = useState(null) // { kind: 'ok'|'error', text }
  const [busy, setBusy] = useState(null)     // which action is running

  // One helper for every button: calls the API, shows the API's
  // own message in a banner, and refreshes the page data.
  async function callApi(actionName, url, method, body) {
    setBusy(actionName)
    setBanner(null)
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        // Show the server's real reason (e.g. Shiprocket's message)
        setBanner({ kind: 'error', text: data.error || data.detail || `Request failed (${res.status})` })
        return null
      }
      setBanner({ kind: 'ok', text: data.message || 'Saved.' })
      router.refresh() // reload the order from the database
      return data
    } catch (err) {
      setBanner({ kind: 'error', text: `Could not reach the server: ${err.message}` })
      return null
    } finally {
      setBusy(null)
    }
  }

  // ---------- the three groups of actions ----------
  function saveStatus() {
    callApi('status', `/api/admin/orders/${order.id}`, 'PATCH', { status })
  }

  function saveTracking() {
    callApi('tracking', `/api/admin/orders/${order.id}`, 'PATCH', {
      awbNumber: awb,
      shippingPartner: partner,
    })
  }

  async function shiprocket(action) {
    const data = await callApi(`sr-${action}`, `/api/admin/orders/${order.id}/shiprocket`, 'POST', { action })
    if (data && action === 'track') {
      setTrackingText(data.currentStatus || 'No tracking updates yet.')
    }
  }

  return (
    <div style={{ fontFamily: "var(--font-jost), 'Jost', sans-serif", color: '#1A202C', maxWidth: 960 }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <a href="/admin/orders" style={{ fontSize: 13, color: '#4a5568', textDecoration: 'underline' }}>
          ← Back to orders
        </a>
        <h1 style={{ fontSize: 22, fontWeight: 500, margin: '10px 0 4px 0' }}>
          Order {order.id.slice(0, 8)}…
        </h1>
        <p style={{ margin: 0, fontSize: 13, color: '#4a5568' }}>
          Placed {new Date(order.createdAt).toLocaleString('en-IN', {
            day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit',
          })}
          {' · '}
          <span
            style={{
              display: 'inline-block', padding: '1px 10px', borderRadius: 999,
              fontSize: 12, color: '#fff', textTransform: 'capitalize',
              background: STATUS_COLORS[order.status] || '#4a5568',
            }}
          >
            {order.status}
          </span>
        </p>
      </div>

      {/* Success / error banner — every action reports here */}
      {banner && (
        <div
          style={{
            padding: '12px 16px', borderRadius: 6, marginBottom: 20, fontSize: 14,
            background: banner.kind === 'ok' ? '#c6f6d5' : '#fed7d7',
            color: banner.kind === 'ok' ? '#22543d' : '#822727',
            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          }}
        >
          {banner.text}
        </div>
      )}

      {/* Items */}
      <div style={sectionStyle}>
        <h2 style={sectionTitle}>Items</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '2px solid #e2e8f0', color: '#4a5568' }}>
              <th style={{ padding: '8px' }}>Product</th>
              <th style={{ padding: '8px' }}>Size</th>
              <th style={{ padding: '8px' }}>Qty</th>
              <th style={{ padding: '8px' }}>Price</th>
              <th style={{ padding: '8px', textAlign: 'right' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id} style={{ borderBottom: '1px solid #edf2f7' }}>
                <td style={{ padding: '8px', fontWeight: 500 }}>{item.productName}</td>
                <td style={{ padding: '8px' }}>
                  {item.variantDetails?.size || '—'}
                  {item.variantDetails?.color ? ` / ${item.variantDetails.color}` : ''}
                </td>
                <td style={{ padding: '8px' }}>{item.quantity}</td>
                <td style={{ padding: '8px' }}>{rupees(item.priceAtPurchase)}</td>
                <td style={{ padding: '8px', textAlign: 'right' }}>{rupees(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {/* Totals */}
        <div style={{ marginTop: 12, fontSize: 14, textAlign: 'right', color: '#4a5568' }}>
          {order.discountAmount > 0 && (
            <div>Discount{order.couponCode ? ` (${order.couponCode})` : ''}: −{rupees(order.discountAmount)}</div>
          )}
          <div>Shipping: {order.shippingAmount === 0 ? 'Free' : rupees(order.shippingAmount)}</div>
          <div style={{ fontSize: 16, color: '#1A202C', fontWeight: 500, marginTop: 4 }}>
            Total: {rupees(order.totalAmount)}
          </div>
        </div>
      </div>

      {/* Customer + address + payment, side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20, marginBottom: 20 }}>
        <div style={{ ...sectionStyle, marginBottom: 0 }}>
          <h2 style={sectionTitle}>Ship to</h2>
          <div style={{ fontSize: 14, lineHeight: 1.7, color: '#4a5568' }}>
            <div style={{ color: '#1A202C', fontWeight: 500 }}>{addr.fullName || order.user?.name || '—'}</div>
            <div>{addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}</div>
            <div>{addr.city}, {addr.state} — {addr.pincode}</div>
            <div>Phone: {addr.phone || '—'}</div>
            <div>Email: {order.user?.email || '—'}</div>
          </div>
        </div>

        <div style={{ ...sectionStyle, marginBottom: 0 }}>
          <h2 style={sectionTitle}>Payment</h2>
          <div style={{ fontSize: 14, lineHeight: 1.9, color: '#4a5568' }}>
            <div>Method: <strong style={{ color: '#1A202C', textTransform: 'uppercase' }}>{order.paymentMethod}</strong></div>
            <div>
              Status:{' '}
              <span
                style={{
                  display: 'inline-block', padding: '1px 10px', borderRadius: 999, fontSize: 12,
                  color: '#fff', textTransform: 'capitalize',
                  background: order.paymentStatus === 'paid' ? '#276749' : '#b7791f',
                }}
              >
                {order.paymentStatus}
              </span>
            </div>
            {order.paymentId && <div style={{ wordBreak: 'break-all' }}>Payment ID: {order.paymentId}</div>}
            {order.paymentMethod === 'cod' && order.codAmount != null && (
              <div>To collect at the door: <strong style={{ color: '#1A202C' }}>{rupees(order.codAmount)}</strong></div>
            )}
          </div>
        </div>
      </div>

      {/* ===================== ACTIONS ===================== */}

      {/* 1. Change the status by hand */}
      <div style={sectionStyle}>
        <h2 style={sectionTitle}>Order status</h2>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <label style={labelStyle} htmlFor="order-status">Status</label>
            <select
              id="order-status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={{ ...inputStyle, width: 220 }}
            >
              <option value="confirmed">confirmed</option>
              <option value="processing">processing</option>
              <option value="shipped">shipped</option>
              <option value="delivered">delivered</option>
              <option value="cancelled">cancelled</option>
            </select>
          </div>
          <button style={darkButton} onClick={saveStatus} disabled={busy !== null}>
            {busy === 'status' ? 'Saving…' : 'Save status'}
          </button>
        </div>
        <p style={{ fontSize: 12, color: '#4a5568', marginTop: 10, marginBottom: 0 }}>
          "shipped" emails the customer · "delivered" marks COD orders as paid and credits loyalty points ·
          "cancelled" puts the items back into stock.
        </p>
      </div>

      {/* 2. Type in a tracking number by hand (if not using Shiprocket) */}
      <div style={sectionStyle}>
        <h2 style={sectionTitle}>Tracking (manual)</h2>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <label style={labelStyle} htmlFor="awb">Tracking number (AWB)</label>
            <input
              id="awb"
              value={awb}
              onChange={(e) => setAwb(e.target.value)}
              placeholder="e.g. 141123456789"
              style={{ ...inputStyle, width: 220 }}
            />
          </div>
          <div>
            <label style={labelStyle} htmlFor="partner">Courier</label>
            <input
              id="partner"
              value={partner}
              onChange={(e) => setPartner(e.target.value)}
              placeholder="e.g. Delhivery"
              style={{ ...inputStyle, width: 180 }}
            />
          </div>
          <button style={darkButton} onClick={saveTracking} disabled={busy !== null}>
            {busy === 'tracking' ? 'Saving…' : 'Save tracking'}
          </button>
        </div>
      </div>

      {/* 3. Shiprocket — the one-click shipping flow */}
      <div style={sectionStyle}>
        <h2 style={sectionTitle}>Shiprocket</h2>

        {order.srOrderId && (
          <p style={{ fontSize: 13, color: '#4a5568', marginTop: 0 }}>
            Sent to Shiprocket · order {order.srOrderId} · shipment {order.srShipmentId}
            {order.awbNumber ? ` · AWB ${order.awbNumber}` : ''}
          </p>
        )}

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {/* Step 1: create the order inside Shiprocket */}
          <button
            style={{ ...darkButton, opacity: order.srOrderId ? 0.5 : 1 }}
            onClick={() => shiprocket('create')}
            disabled={busy !== null || !!order.srOrderId}
            title={order.srOrderId ? 'Already sent to Shiprocket' : ''}
          >
            {busy === 'sr-create' ? 'Sending…' : 'Send to Shiprocket'}
          </button>

          {/* Step 2: book a courier + get the tracking number */}
          <button
            style={{ ...lightButton, opacity: order.srShipmentId ? 1 : 0.5 }}
            onClick={() => shiprocket('awb')}
            disabled={busy !== null || !order.srShipmentId}
            title={order.srShipmentId ? '' : 'Send to Shiprocket first'}
          >
            {busy === 'sr-awb' ? 'Booking…' : 'Generate AWB (book courier)'}
          </button>

          {/* Step 3: check where the parcel is */}
          <button
            style={{ ...lightButton, opacity: order.srShipmentId ? 1 : 0.5 }}
            onClick={() => shiprocket('track')}
            disabled={busy !== null || !order.srShipmentId}
            title={order.srShipmentId ? '' : 'Send to Shiprocket first'}
          >
            {busy === 'sr-track' ? 'Checking…' : 'Refresh tracking'}
          </button>
        </div>

        {order.srOrderId && (
          <p style={{ fontSize: 12, color: '#4a5568', marginTop: 10, marginBottom: 0 }}>
            "Send to Shiprocket" is disabled because this order is already in Shiprocket.
          </p>
        )}

        {trackingText && (
          <p style={{ fontSize: 14, marginTop: 12, marginBottom: 0 }}>
            Latest tracking status: <strong>{trackingText}</strong>
          </p>
        )}

        <p style={{ fontSize: 12, color: '#718096', marginTop: 14, marginBottom: 0 }}>
          Requires SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD in the environment;
          pickup address must be configured in your Shiprocket dashboard.
        </p>
      </div>

      {/* Admin-only notes on the order (customers never see these) */}
      {order.notes && (
        <div style={sectionStyle}>
          <h2 style={sectionTitle}>Notes</h2>
          <p style={{ fontSize: 14, whiteSpace: 'pre-wrap', margin: 0, color: '#4a5568' }}>{order.notes}</p>
        </div>
      )}
    </div>
  )
}
