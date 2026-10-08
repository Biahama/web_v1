import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'
import { indiaDate } from '@/lib/admin-insights'
import { RETURN_STATUSES } from '@/lib/return-service'
import ReturnEditor from '@/components/admin/ReturnEditor'

export const dynamic = 'force-dynamic'
export default async function ReturnsPage({ searchParams }) {
  await requireAdmin()
  const params = await searchParams
  const status = RETURN_STATUSES.includes(params?.status) ? params.status : params?.status === 'all' ? 'all' : 'open'
  const page = Math.max(1, Math.min(10000, parseInt(params?.page, 10) || 1))
  const where = status === 'all' ? {} : status === 'open' ? { status: { in: ['requested', 'approved', 'received'] } } : { status }
  let requests, count
  try {
    ;[count, requests] = await Promise.all([prisma.returnRequest.count({ where }), prisma.returnRequest.findMany({ where, orderBy: { createdAt: 'desc' }, take: 20, skip: (page - 1) * 20, include: { order: { select: { id: true, deliveredAt: true, paymentMethod: true, totalAmount: true, user: { select: { name: true, email: true } } } } } })])
  } catch (error) {
    if (error.code !== 'P2021' && error.code !== 'P2022') throw error
    return <div className="admin-page"><h1>Returns & exchanges</h1><div className="admin-notice">The returns database rollout is required before this feature is available. Apply the reviewed customer-service SQL before deploying these changes.</div></div>
  }
  return <div className="admin-page"><header className="admin-page-header"><div><p className="eyebrow">Care beyond the purchase</p><h1>Returns & exchanges</h1><p className="muted">Review requests, share instructions, and record completed resolutions.</p></div></header><nav className="admin-filters" aria-label="Return filters">{['open', 'all', ...RETURN_STATUSES].map(s => <Link key={s} aria-current={s === status ? 'page' : undefined} href={'?status=' + s}>{s === 'open' ? 'Needs attention' : s.replace('_', ' ')}</Link>)}</nav>
    <p className="muted">{count} requests</p>{!requests.length && <div className="quiet-empty">No requests in this view.<p>Customer requests will appear here after delivery.</p></div>}
    {requests.map(request => <article className="admin-panel return-admin-card" key={request.id}><div className="section-header"><div><p className="eyebrow">{request.kind === 'exchange' ? 'Size exchange' : 'Return'} · #{request.id.slice(-8).toUpperCase()}</p><h2>{request.order.user.name || request.order.user.email}</h2><p className="muted">{indiaDate(request.createdAt)} · {request.status}</p></div><Link className="text-action" href={'/admin/orders/' + request.orderId}>View order →</Link></div>
      {!request.order.deliveredAt && <p className="admin-notice">Delivery date was not recorded on this older order. Verify the delivery date and 14-day eligibility before approval.</p>}
      <p><strong>Reason:</strong> {request.reason}</p>{request.details && <p className="return-details">{request.details}</p>}
      <ul className="return-item-list">{request.items.map(item => <li key={item.orderItemId}>{item.quantity} × {item.productName} · {item.variantDetails?.size} / {item.variantDetails?.color}</li>)}</ul>
      <ReturnEditor key={request.id + ':' + request.updatedAt.toISOString()} request={JSON.parse(JSON.stringify(request))} />
    </article>)}
    <nav className="pagination" aria-label="Return pages">{page > 1 && <Link href={'?status=' + status + '&page=' + (page - 1)}>← Previous</Link>}<span>Page {page}</span>{page * 20 < count && <Link href={'?status=' + status + '&page=' + (page + 1)}>Next →</Link>}</nav>
  </div>
}
