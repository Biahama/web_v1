// ============================================================
// ADMIN DASHBOARD — the first thing you see at /admin
// ============================================================
// Shows three quick numbers (products, orders, recent errors)
// and a table of the latest recorded errors. Every database
// read is wrapped in try/catch, so even if the database is
// down this page still loads and tells you so.
// ============================================================

import { prisma } from '@/lib/prisma'

// Always show fresh numbers — never a cached copy.
export const dynamic = 'force-dynamic'

// Small reusable stat card.
function StatCard({ label, value }) {
  return (
    <div
      style={{
        border: '1px solid #e5e5e5',
        borderRadius: 6,
        padding: '20px 24px',
        minWidth: 180,
      }}
    >
      <div style={{ fontSize: 32, fontWeight: 500, color: '#1A202C' }}>{value}</div>
      <div style={{ fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6f6f6f', marginTop: 4 }}>
        {label}
      </div>
    </div>
  )
}

export default async function AdminDashboard() {
  // Collect everything the page needs. If the database is
  // unreachable we show a friendly banner instead of crashing.
  let productCount = null
  let orderCount = null
  let recentErrorCount = null
  let recentErrors = []
  let dbDown = false

  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    ;[productCount, orderCount, recentErrorCount, recentErrors] = await Promise.all([
      prisma.product.count(),
      prisma.order.count(),
      prisma.errorLog.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.errorLog.findMany({ orderBy: { createdAt: 'desc' }, take: 15 }),
    ])
  } catch (error) {
    // Don't crash the dashboard — just say the database is unreachable.
    console.error('[admin dashboard] Could not read from the database:', error?.message)
    dbDown = true
  }

  const cellStyle = {
    padding: '10px 12px',
    borderBottom: '1px solid #e5e5e5',
    fontSize: 13,
    verticalAlign: 'top',
  }

  return (
    <div style={{ maxWidth: 900 }}>
      <h1
        style={{
          fontFamily: 'var(--font-display), serif',
          fontSize: 32,
          fontWeight: 500,
          color: '#1A202C',
          margin: 0,
        }}
      >
        Welcome back
      </h1>
      <p style={{ color: '#6f6f6f', fontSize: 14, marginTop: 6, marginBottom: 28 }}>
        A quick look at how the shop is doing.
      </p>

      {dbDown ? (
        <div
          style={{
            background: '#FFF5F5',
            border: '1px solid #FEB2B2',
            color: '#9B2C2C',
            borderRadius: 6,
            padding: '16px 20px',
            fontSize: 14,
          }}
        >
          We could not reach the database right now, so the numbers below are unavailable.
          The live shop keeps working with its saved defaults. Try refreshing in a minute.
        </div>
      ) : (
        <>
          {/* ---- The three stat cards ---- */}
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 40 }}>
            <StatCard label="Products" value={productCount} />
            <StatCard label="Orders" value={orderCount} />
            <StatCard label="Errors (last 7 days)" value={recentErrorCount} />
          </div>

          {/* ---- Recent errors table ---- */}
          <h2 style={{ fontSize: 18, fontWeight: 500, color: '#1A202C', marginBottom: 12 }}>
            Recent errors
          </h2>

          {recentErrors.length === 0 ? (
            <p style={{ color: '#2F855A', fontSize: 14 }}>
              No errors recorded — everything is healthy.
            </p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ ...cellStyle, textAlign: 'left', color: '#6f6f6f', fontWeight: 500, whiteSpace: 'nowrap' }}>When</th>
                  <th style={{ ...cellStyle, textAlign: 'left', color: '#6f6f6f', fontWeight: 500 }}>Where</th>
                  <th style={{ ...cellStyle, textAlign: 'left', color: '#6f6f6f', fontWeight: 500 }}>What happened</th>
                </tr>
              </thead>
              <tbody>
                {recentErrors.map((err) => (
                  <tr key={err.id}>
                    <td style={{ ...cellStyle, whiteSpace: 'nowrap', color: '#6f6f6f' }}>
                      {new Date(err.createdAt).toLocaleString('en-IN')}
                    </td>
                    <td style={cellStyle}>{err.source}</td>
                    <td style={cellStyle}>{err.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  )
}
