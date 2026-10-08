import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'
import { reportPeriod, rupees, indiaDate, PAID_ORDER_WHERE } from '@/lib/admin-insights'

export const dynamic = 'force-dynamic'

function Metric({ label, value, detail }) {
  return <article className="admin-metric"><p className="eyebrow">{label}</p><strong>{value}</strong><p className="muted">{detail}</p></article>
}
export default async function AdminDashboard({ searchParams }) {
  await requireAdmin()
  const params = await searchParams
  const period = reportPeriod(params?.days)
  const currentWhere = { ...PAID_ORDER_WHERE, createdAt: { gte: period.start, lte: period.end } }
  const results = await Promise.allSettled([
    prisma.order.aggregate({ where: currentWhere, _sum: { totalAmount: true }, _count: { _all: true } }),
    prisma.order.aggregate({ where: { ...PAID_ORDER_WHERE, createdAt: { gte: period.previous, lt: period.start } }, _sum: { totalAmount: true } }),
    prisma.order.count({ where: { status: { in: ['confirmed', 'processing'] }, OR: [{ paymentStatus: 'paid' }, { paymentMethod: 'cod' }] } }),
    prisma.productVariant.count({ where: { product: { isActive: true }, stockQty: { lte: 5 } } }),
    prisma.user.count({ where: { createdAt: { gte: period.start, lte: period.end } } }),
    prisma.returnRequest.count({ where: { status: { in: ['requested', 'approved', 'received'] } } }),
    prisma.order.findMany({ orderBy: { createdAt: 'desc' }, take: 6, select: { id: true, createdAt: true, status: true, totalAmount: true, paymentStatus: true, shippingAddress: true, user: { select: { name: true } } } }),
    prisma.orderItem.groupBy({ by: ['productId', 'productName'], where: { order: currentWhere }, _sum: { quantity: true }, orderBy: { _sum: { quantity: 'desc' } }, take: 5 }),
    prisma.errorLog.findMany({ orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, source: true, message: true, createdAt: true } }),
    prisma.$queryRaw`SELECT to_char("createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD') AS day, SUM("totalAmount")::bigint AS amount FROM "Order" WHERE "paymentStatus" = 'paid' AND status <> 'cancelled' AND "createdAt" >= ${period.start} AND "createdAt" <= ${period.end} GROUP BY day ORDER BY day`,
  ])
  const val = (index, fallback = null) => results[index].status === 'fulfilled' ? results[index].value : fallback
  const failed = results.some(result => result.status === 'rejected')
  const sales = val(0)
  const amount = sales?._sum.totalAmount || 0
  const count = sales?._count._all || 0
  const before = val(1)?._sum.totalAmount || 0
  const comparison = results[1].status === 'rejected' ? 'Comparison unavailable' : before ? ((amount - before) / before * 100).toFixed(1) + '% vs previous period' : 'No paid orders in the previous period'
  const chart = val(9, []).map(row => ({ day: row.day, amount: Number(row.amount) }))
  const peak = Math.max(1, ...chart.map(row => row.amount))
  return <div className="admin-page">
    <header className="admin-page-header"><div><p className="eyebrow">Biahama · Store overview</p><h1>A clear view of your store.</h1><p className="muted">Sales, service, and the details that need your attention.</p></div><div className="admin-period" aria-label="Reporting period">{[7, 30, 90].map(days => <Link key={days} aria-current={period.days === days ? 'page' : undefined} href={'?days=' + days}>{days} days</Link>)}</div></header>
    <div className="admin-report-caption"><p>{indiaDate(period.start)} – {indiaDate(period.end)} · IST · INR</p><a className="text-action" href={'/api/admin/reports/sales?days=' + period.days}>Export sales CSV ↓</a></div>
    {failed && <p className="admin-notice" role="status">Some data is unavailable. A dash means unavailable, not zero. Returns require the customer-service database rollout.</p>}
    <div className="admin-metrics"><Metric label="Paid order value" value={sales ? rupees(amount) : '—'} detail={sales ? comparison : 'Unavailable'} /><Metric label="Paid orders" value={sales ? count : '—'} detail="Excludes cancelled and refunded orders" /><Metric label="Average paid order" value={sales ? rupees(count ? Math.round(amount / count) : 0) : '—'} detail="Includes shipping; after discounts" /><Metric label="New customers" value={val(4, '—')} detail="Accounts created in this period" /></div>
    <div className="admin-attention"><p className="eyebrow">Next on your list</p><div>{[['Orders to fulfill', 2, '/admin/orders'], ['Sizes to replenish', 3, '/admin/inventory?filter=attention'], ['Open return requests', 5, '/admin/returns']].map(([label, index, href]) => <Link href={href} key={href}><strong>{val(index, '—')}</strong><span>{label}</span><span aria-hidden="true">→</span></Link>)}</div></div>
    <div className="admin-dashboard-grid"><section className="admin-panel"><div className="section-header"><h2>Sales over time</h2><span className="muted">Paid order value</span></div>{chart.length ? <div className="sales-bars" role="img" aria-label={'Daily paid order value. ' + chart.map(row => row.day + ': ' + rupees(row.amount)).join('; ')}>{chart.map(row => <div className="sales-bar-row" key={row.day}><span>{row.day.slice(5)}</span><div><i style={{ width: Math.max(1, row.amount / peak * 100) + '%' }} /></div><span>{rupees(row.amount)}</span></div>)}</div> : <p className="muted">{results[9].status === 'rejected' ? 'Sales history unavailable.' : 'No paid orders in this period.'}</p>}<p className="muted chart-note">Days with no paid orders are omitted. Order value includes GST, shipping, and discounts; manual return refunds are not deducted. Reconcile those in Razorpay; this is not profit or bank settlements.</p></section>
    <section className="admin-panel"><div className="section-header"><h2>Most chosen pieces</h2><span className="muted">Units sold</span></div>{val(7, []).map((row, index) => <Link className="seller-row" href={'/admin/products/' + row.productId} key={row.productId + row.productName}><span>{String(index + 1).padStart(2, '0')}</span><span>{row.productName}</span><strong>{row._sum.quantity}</strong></Link>)}{!val(7, []).length && <p className="muted">{results[7].status === 'rejected' ? 'Product sales unavailable.' : 'Your bestsellers will appear after the first paid orders.'}</p>}</section></div>
    <section className="admin-panel"><div className="section-header"><h2>Recent orders</h2><Link className="text-action" href="/admin/orders">Manage orders →</Link></div><div className="table-scroll"><table className="admin-table"><thead><tr><th>Order</th><th>Customer</th><th>Date</th><th>Total</th><th>Payment</th><th>Status</th></tr></thead><tbody>{val(6, []).map(o => <tr key={o.id}><td><Link href={'/admin/orders/' + o.id}>#{o.id.slice(-8).toUpperCase()}</Link></td><td>{o.user.name || o.shippingAddress?.fullName || 'Customer'}</td><td>{indiaDate(o.createdAt)}</td><td>{rupees(o.totalAmount)}</td><td>{o.paymentStatus.replaceAll('_', ' ')}</td><td><span className="subtle-badge">{o.status}</span></td></tr>)}</tbody></table></div>{!val(6, []).length && <p className="muted">{results[6].status === 'rejected' ? 'Orders unavailable.' : 'No orders yet.'}</p>}</section>
    <details className="admin-panel admin-errors" id="errors"><summary>Recent technical errors ({val(8, []).length})</summary><p className="muted">Recorded errors are a diagnostic signal; an empty log does not prove every integration is healthy.</p>{val(8, []).map(err => <div key={err.id}><strong>{err.source}</strong><small>{indiaDate(err.createdAt)}</small><p>{err.message}</p></div>)}<Link className="text-action" href="/admin/operations">Operations & recovery →</Link></details>
  </div>
}
