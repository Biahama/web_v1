// ============================================================
// /admin/analytics — how the shop is doing, in plain numbers
// ============================================================
// Everything here comes from two places:
// 1. The AnalyticsEvent table — the storefront quietly records
//    anonymous events (page views, add-to-carts, saves).
// 2. The Order and Coupon tables — real sales.
//
// Pick a time range with the 7 / 30 / 90-day tabs at the top.
// Access is already checked by the /admin layout.
// For heatmaps and recordings of real visits, use the free
// Microsoft Clarity dashboard at clarity.microsoft.com.
// ============================================================

import Link from 'next/link'
import { prisma } from '@/lib/prisma'

// Always show fresh numbers — never a cached copy.
export const dynamic = 'force-dynamic'

// Amounts are stored in paise; show rupees, Indian style.
function rupees(paise) {
  return '₹' + ((paise || 0) / 100).toLocaleString('en-IN')
}

// "3 of 100" -> "3.0%". Never divides by zero.
function percent(part, whole) {
  if (!whole) return '—'
  return ((part / whole) * 100).toFixed(1) + '%'
}

// Same stat card style as the dashboard: big number, small label.
function StatCard({ label, value, hint }) {
  return (
    <div style={{ border: '1px solid #e5e5e5', borderRadius: 6, padding: '20px 24px', minWidth: 160 }}>
      <div style={{ fontSize: 32, fontWeight: 500, color: '#1A202C' }}>{value}</div>
      <div style={{ fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6f6f6f', marginTop: 4 }}>
        {label}
      </div>
      {hint && <div style={{ fontSize: 12, color: '#a0aec0', marginTop: 4 }}>{hint}</div>}
    </div>
  )
}

export default async function AdminAnalyticsPage({ searchParams }) {
  // Which time range? ?days=7, 30 or 90. Anything else -> 30.
  const params = await searchParams
  const days = [7, 30, 90].includes(Number(params?.days)) ? Number(params.days) : 30
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  // ---- Gather every number the page needs (one safety net) ----
  let dbDown = false
  let sessions = 0
  let pageViews = 0
  let addToCarts = 0
  let wardrobeSaves = 0
  let orderCount = 0
  let revenue = 0
  let topPages = []
  let coupons = []
  let couponOrders = []
  let firstEvent = null

  try {
    const inRange = { createdAt: { gte: since } }
    const results = await Promise.all([
      // "Sessions" = distinct anonymous browser ids that viewed a page.
      prisma.analyticsEvent.findMany({
        where: { type: 'page_view', sessionKey: { not: null }, ...inRange },
        distinct: ['sessionKey'],
        select: { sessionKey: true },
      }),
      prisma.analyticsEvent.count({ where: { type: 'page_view', ...inRange } }),
      prisma.analyticsEvent.count({ where: { type: 'add_to_cart', ...inRange } }),
      prisma.analyticsEvent.count({ where: { type: 'wardrobe_save', ...inRange } }),
      // Real orders in range (cancelled ones don't count as sales).
      prisma.order.aggregate({
        where: { ...inRange, status: { not: 'cancelled' } },
        _count: { _all: true },
        _sum: { totalAmount: true },
      }),
      // Most-viewed pages, top 8.
      prisma.analyticsEvent.groupBy({
        by: ['path'],
        where: { type: 'page_view', path: { not: null }, ...inRange },
        _count: { _all: true },
        orderBy: { _count: { path: 'desc' } },
        take: 8,
      }),
      // Every coupon, plus how each performed in this range.
      prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.order.groupBy({
        by: ['couponCode'],
        where: { ...inRange, couponCode: { not: null }, status: { not: 'cancelled' } },
        _count: { _all: true },
        _sum: { discountAmount: true },
      }),
      // When did counting start? (for the footnote)
      prisma.analyticsEvent.findFirst({ orderBy: { createdAt: 'asc' }, select: { createdAt: true } }),
    ])

    sessions = results[0].length
    pageViews = results[1]
    addToCarts = results[2]
    wardrobeSaves = results[3]
    orderCount = results[4]._count._all
    revenue = results[4]._sum.totalAmount || 0
    topPages = results[5]
    coupons = results[6]
    couponOrders = results[7]
    firstEvent = results[8]
  } catch (error) {
    // Database unreachable — show a friendly note instead of crashing.
    console.error('[admin analytics] Could not read from the database:', error?.message)
    dbDown = true
  }

  // Merge the per-coupon order stats into an easy lookup by code.
  const byCoupon = {}
  for (const row of couponOrders) {
    byCoupon[row.couponCode] = { orders: row._count._all, discount: row._sum.discountAmount || 0 }
  }

  const cellStyle = { padding: '10px 12px', borderBottom: '1px solid #e5e5e5', fontSize: 13 }
  const headStyle = { ...cellStyle, textAlign: 'left', color: '#6f6f6f', fontWeight: 500 }

  // Simple link "tabs" for the time range.
  const tabStyle = (active) => ({
    padding: '6px 14px',
    borderRadius: 4,
    fontSize: 13,
    textDecoration: 'none',
    background: active ? '#1A202C' : 'transparent',
    color: active ? '#fff' : '#4a5568',
    border: '1px solid ' + (active ? '#1A202C' : '#e2e8f0'),
  })

  return (
    <div style={{ maxWidth: 900, fontFamily: "var(--font-jost), 'Jost', sans-serif" }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 8 }}>
        <h1 style={{ fontSize: 24, fontWeight: 500, color: '#1A202C', margin: 0 }}>Analytics</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href="/admin/analytics?days=7" style={tabStyle(days === 7)}>7 days</Link>
          <Link href="/admin/analytics?days=30" style={tabStyle(days === 30)}>30 days</Link>
          <Link href="/admin/analytics?days=90" style={tabStyle(days === 90)}>90 days</Link>
        </div>
      </div>
      <p style={{ color: '#6f6f6f', fontSize: 14, marginTop: 0, marginBottom: 28 }}>
        Anonymous visitor counts and sales for the last {days} days.
      </p>

      {dbDown ? (
        <div
          style={{
            background: '#FFF5F5', border: '1px solid #FEB2B2', color: '#9B2C2C',
            borderRadius: 6, padding: '16px 20px', fontSize: 14,
          }}
        >
          We could not reach the database right now, so the numbers are unavailable.
          The live shop keeps working. Try refreshing in a minute.
        </div>
      ) : (
        <>
          {/* ---- Stat cards ---- */}
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
            <StatCard label="Sessions" value={sessions.toLocaleString('en-IN')} hint="unique visitors" />
            <StatCard label="Page views" value={pageViews.toLocaleString('en-IN')} />
            <StatCard label="Orders" value={orderCount.toLocaleString('en-IN')} />
            <StatCard label="Revenue" value={rupees(revenue)} />
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 40 }}>
            <StatCard label="Conversion rate" value={percent(orderCount, sessions)} hint="orders per visitor" />
            <StatCard label="Add-to-cart rate" value={percent(addToCarts, sessions)} hint={`${addToCarts.toLocaleString('en-IN')} add-to-carts`} />
            <StatCard label="Wardrobe saves" value={wardrobeSaves.toLocaleString('en-IN')} />
          </div>

          {/* ---- Top pages ---- */}
          <h2 style={{ fontSize: 18, fontWeight: 500, color: '#1A202C', marginBottom: 12 }}>Top pages</h2>
          {topPages.length === 0 ? (
            <p style={{ color: '#6f6f6f', fontSize: 14 }}>No page views recorded in this period yet.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 40 }}>
              <thead>
                <tr>
                  <th style={headStyle}>Page</th>
                  <th style={{ ...headStyle, textAlign: 'right' }}>Views</th>
                </tr>
              </thead>
              <tbody>
                {topPages.map((row) => (
                  <tr key={row.path}>
                    <td style={cellStyle}>{row.path}</td>
                    <td style={{ ...cellStyle, textAlign: 'right' }}>{row._count._all.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* ---- Coupon performance ---- */}
          <h2 style={{ fontSize: 18, fontWeight: 500, color: '#1A202C', marginBottom: 12 }}>Coupon performance</h2>
          {coupons.length === 0 ? (
            <p style={{ color: '#6f6f6f', fontSize: 14, marginBottom: 40 }}>No coupons created yet.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 40 }}>
              <thead>
                <tr>
                  <th style={headStyle}>Code</th>
                  <th style={{ ...headStyle, textAlign: 'right' }}>Times used (all time)</th>
                  <th style={{ ...headStyle, textAlign: 'right' }}>Orders (this period)</th>
                  <th style={{ ...headStyle, textAlign: 'right' }}>Discount given (this period)</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((c) => {
                  const stats = byCoupon[c.code] || { orders: 0, discount: 0 }
                  return (
                    <tr key={c.id}>
                      <td style={{ ...cellStyle, fontWeight: 500 }}>{c.code}</td>
                      <td style={{ ...cellStyle, textAlign: 'right' }}>{c.usedCount}</td>
                      <td style={{ ...cellStyle, textAlign: 'right' }}>{stats.orders}</td>
                      <td style={{ ...cellStyle, textAlign: 'right' }}>{rupees(stats.discount)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}

          {/* ---- Footnote ---- */}
          <p style={{ color: '#a0aec0', fontSize: 12 }}>
            {firstEvent
              ? `Counting started ${new Date(firstEvent.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}. `
              : 'No events counted yet — numbers will appear once shoppers start browsing. '}
            For heatmaps and session recordings, open clarity.microsoft.com.
          </p>
        </>
      )}
    </div>
  )
}
