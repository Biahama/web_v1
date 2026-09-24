// ============================================================
// MY ACCOUNT — profile, order history, saved addresses.
// (The profile icon in the navbar links here; it used to 404.)
// ============================================================

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/prisma'
import { logError } from '@/lib/logger'
import { getPointsBalance } from '@/lib/loyalty'
import SignOutButton from '@/components/auth/SignOutButton'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'My Account — Biahama' }

function formatPrice(paise) {
  return `₹${(paise / 100).toLocaleString('en-IN')}`
}

const sectionTitle = {
  fontFamily: 'var(--font-ui)',
  fontSize: 13,
  fontWeight: 400,
  letterSpacing: 2,
  textTransform: 'uppercase',
  color: '#262626',
  margin: '0 0 16px 0',
}

export default async function AccountPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/?login=true')

  // Load orders and addresses — if the database hiccups, show the
  // page anyway with a notice instead of crashing.
  let orders = []
  let addresses = []
  let loyaltyPoints = 0 // falls back to 0 if the database hiccups
  let loadFailed = false
  try {
    ;[orders, addresses, loyaltyPoints] = await Promise.all([
      prisma.order.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        include: { items: true },
      }),
      prisma.address.findMany({
        where: { userId: user.id },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      }),
      getPointsBalance(user.id), // loyalty points earned so far
    ])
  } catch (error) {
    loadFailed = true
    await logError('account page — load', error, { userId: user.id })
  }

  const meta = user.user_metadata ?? {}
  const name =
    [meta.first_name, meta.last_name].filter(Boolean).join(' ') ||
    meta.full_name || meta.name || 'there'

  return (
    <div style={{ maxWidth: 880, margin: '0 auto', padding: '140px 24px 96px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16, marginBottom: 48 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 38, fontWeight: 300, color: '#262626', margin: '0 0 6px 0' }}>
            Hello, {name}
          </h1>
          <p style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: '#6f6f6f', margin: 0 }}>{user.email}</p>
          {/* Loyalty points — earned on paid orders, ₹100 spent = points */}
          <p style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: '#6f6f6f', margin: '4px 0 0 0' }}>
            ★ {loyaltyPoints.toLocaleString('en-IN')} point{loyaltyPoints === 1 ? '' : 's'}
          </p>
        </div>
        <SignOutButton />
      </div>

      {loadFailed && (
        <p style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: '#cc0000', marginBottom: 32 }}>
          We couldn&apos;t load your orders right now — the issue has been recorded. Please refresh in a moment.
        </p>
      )}

      {/* Quick link to wardrobe */}
      <div style={{ marginBottom: 48 }}>
        <Link
          href="/account/wardrobe"
          style={{ fontFamily: 'var(--font-ui)', fontSize: 13, letterSpacing: 1.5, textTransform: 'uppercase', color: '#262626', textDecoration: 'underline' }}
        >
          View My Wardrobe (saved items) →
        </Link>
      </div>

      {/* Orders */}
      <div style={{ marginBottom: 56 }}>
        <h2 style={sectionTitle}>My Orders</h2>
        {orders.length === 0 ? (
          <p style={{ fontFamily: 'var(--font-ui)', fontSize: 14, color: '#6f6f6f' }}>
            No orders yet. <Link href="/shop" style={{ color: '#262626', textDecoration: 'underline' }}>Explore the collection</Link>.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {orders.map((order) => (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 16,
                  padding: '18px 0',
                  borderBottom: '1px solid #e5e5e5',
                  textDecoration: 'none',
                  fontFamily: 'var(--font-ui)',
                }}
              >
                <div>
                  <p style={{ fontSize: 14, color: '#262626', margin: '0 0 4px 0' }}>
                    {order.items.length} item{order.items.length > 1 ? 's' : ''} · {formatPrice(order.totalAmount)}
                  </p>
                  <p style={{ fontSize: 12, color: '#6f6f6f', margin: 0 }}>
                    {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
                <span style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: order.status === 'cancelled' ? '#cc0000' : '#262626' }}>
                  {order.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Addresses */}
      <div>
        <h2 style={sectionTitle}>Saved Addresses</h2>
        {addresses.length === 0 ? (
          <p style={{ fontFamily: 'var(--font-ui)', fontSize: 14, color: '#6f6f6f' }}>
            No saved addresses yet — you can add one during checkout.
          </p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
            {addresses.map((a) => (
              <div key={a.id} style={{ border: '1px solid #e5e5e5', padding: '20px', fontFamily: 'var(--font-ui)', fontSize: 13, lineHeight: 1.7, color: '#404040' }}>
                {a.isDefault && (
                  <p style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: '#6f6f6f', margin: '0 0 8px 0' }}>Default</p>
                )}
                <p style={{ margin: 0, color: '#262626' }}>{a.fullName}</p>
                <p style={{ margin: 0 }}>{a.line1}{a.line2 ? `, ${a.line2}` : ''}</p>
                <p style={{ margin: 0 }}>{a.city}, {a.state} — {a.pincode}</p>
                <p style={{ margin: 0 }}>{a.phone}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
