// ============================================================
// /admin/orders — every customer order, newest first
// ============================================================
// The filter links at the top show only orders in one status.
// Click "View" on a row to manage that order (change status,
// ship it via Shiprocket, add a tracking number...).
// Access is already checked by the /admin layout.
// ============================================================

import Link from 'next/link'
import { prisma } from '@/lib/prisma'

// Always show fresh data — never a cached copy of this page.
export const dynamic = 'force-dynamic'

// Prices are stored in paise; show them as rupees, Indian style.
function rupees(paise) {
  return '₹' + (paise / 100).toLocaleString('en-IN')
}

// One colour per order status, so the list is scannable at a glance.
const STATUS_COLORS = {
  confirmed: '#1A202C', // dark  — paid, waiting to be processed
  processing: '#b7791f', // amber — being prepared / at Shiprocket
  shipped: '#2b6cb0', // blue  — on its way
  delivered: '#276749', // green — done
  cancelled: '#cc0000', // red   — cancelled
}

const FILTERS = ['all', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']

// A small coloured pill (used for both status and payment).
function Pill({ text, color }) {
  return (
    <span
      style={{
        display: 'inline-block', padding: '2px 10px', borderRadius: 999,
        fontSize: 12, color: '#fff', background: color || '#4a5568',
        textTransform: 'capitalize',
      }}
    >
      {text}
    </span>
  )
}

export default async function AdminOrdersPage({ searchParams }) {
  // Next.js gives searchParams as a promise.
  const { status } = await searchParams
  const activeFilter = FILTERS.includes(status) ? status : 'all'

  const orders = await prisma.order.findMany({
    where: activeFilter === 'all' ? undefined : { status: activeFilter },
    orderBy: { createdAt: 'desc' },
    include: {
      items: { select: { id: true } }, // just to count them
      user: { select: { email: true, name: true } },
    },
  })

  return (
    <div style={{ fontFamily: "var(--font-jost), 'Jost', sans-serif", color: '#1A202C' }}>
      <h1 style={{ fontSize: 24, fontWeight: 500, margin: '0 0 20px 0' }}>Orders</h1>

      {/* Filter links: All / confirmed / processing / ... */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
        {FILTERS.map((f) => {
          const isActive = f === activeFilter
          return (
            <Link
              key={f}
              href={f === 'all' ? '/admin/orders' : `/admin/orders?status=${f}`}
              style={{
                padding: '6px 14px', borderRadius: 999, fontSize: 13,
                textDecoration: 'none', textTransform: 'capitalize',
                background: isActive ? '#1A202C' : '#fff',
                color: isActive ? '#fff' : '#4a5568',
                border: '1px solid ' + (isActive ? '#1A202C' : '#cbd5e0'),
              }}
            >
              {f === 'all' ? 'All' : f}
            </Link>
          )
        })}
      </div>

      {orders.length === 0 ? (
        // Friendly empty state
        <div style={{ padding: 48, textAlign: 'center', border: '1px dashed #cbd5e0', borderRadius: 8, color: '#4a5568' }}>
          <p style={{ fontSize: 16, margin: 0 }}>
            {activeFilter === 'all'
              ? 'No orders yet.'
              : `No "${activeFilter}" orders right now.`}
          </p>
          <p style={{ fontSize: 14, marginTop: 8 }}>
            {activeFilter === 'all'
              ? 'Orders appear here the moment a customer checks out.'
              : 'Try another filter above, or "All" to see everything.'}
          </p>
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '2px solid #e2e8f0', color: '#4a5568' }}>
              <th style={{ padding: '10px 8px' }}>Date</th>
              <th style={{ padding: '10px 8px' }}>Customer</th>
              <th style={{ padding: '10px 8px' }}>Items</th>
              <th style={{ padding: '10px 8px' }}>Total</th>
              <th style={{ padding: '10px 8px' }}>Payment</th>
              <th style={{ padding: '10px 8px' }}>Status</th>
              <th style={{ padding: '10px 8px' }}></th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} style={{ borderBottom: '1px solid #edf2f7' }}>
                <td style={{ padding: '8px', whiteSpace: 'nowrap' }}>
                  {new Date(o.createdAt).toLocaleDateString('en-IN', {
                    day: 'numeric', month: 'short', year: 'numeric',
                  })}
                </td>
                <td style={{ padding: '8px' }}>
                  <div style={{ fontWeight: 500 }}>{o.user?.name || o.shippingAddress?.fullName || '—'}</div>
                  <div style={{ color: '#4a5568', fontSize: 12 }}>{o.user?.email || ''}</div>
                </td>
                <td style={{ padding: '8px' }}>{o.items.length}</td>
                <td style={{ padding: '8px' }}>{rupees(o.totalAmount)}</td>
                <td style={{ padding: '8px' }}>
                  <span style={{ textTransform: 'uppercase', fontSize: 12, marginRight: 6 }}>
                    {o.paymentMethod}
                  </span>
                  <Pill
                    text={o.paymentStatus}
                    color={o.paymentStatus === 'paid' ? '#276749' : '#b7791f'}
                  />
                </td>
                <td style={{ padding: '8px' }}>
                  <Pill text={o.status} color={STATUS_COLORS[o.status]} />
                </td>
                <td style={{ padding: '8px' }}>
                  <Link href={`/admin/orders/${o.id}`} style={{ color: '#1A202C', textDecoration: 'underline' }}>
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
