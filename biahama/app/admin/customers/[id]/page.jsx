import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { rupees, indiaDate } from '@/lib/admin-insights'

export const dynamic = 'force-dynamic'
export default async function CustomerDetail({ params }) {
  await requireAdmin()
  const { id } = await params
  const customer = await prisma.user.findUnique({ where: { id }, select: { id: true, name: true, email: true, phone: true, createdAt: true, addresses: { orderBy: { isDefault: 'desc' } }, orders: { orderBy: { createdAt: 'desc' }, take: 100, select: { id: true, totalAmount: true, status: true, paymentStatus: true, createdAt: true } } } })
  if (!customer) notFound()
  return <div className="admin-page"><Link href="/admin/customers" className="text-action">← Customers</Link><header className="admin-page-header"><div><p className="eyebrow">Customer profile</p><h1>{customer.name || 'Customer'}</h1><p className="muted">Joined {indiaDate(customer.createdAt)}</p></div></header><div className="admin-panel"><h2>Contact details</h2><dl className="profile-details"><div><dt>Email</dt><dd>{customer.email}</dd></div><div><dt>Mobile</dt><dd>{customer.phone || 'Not added'}</dd></div></dl></div><section className="admin-panel"><h2>Delivery addresses</h2><div className="address-grid">{customer.addresses.map(a => <article className="address-card" key={a.id}><h3>{a.fullName} {a.isDefault && <span className="subtle-badge">Default</span>}</h3><p>{[a.line1, a.line2, a.area, a.city, a.state, a.pincode].filter(Boolean).join(', ')}</p><p>{a.phone}</p></article>)}</div>{!customer.addresses.length && <p className="muted">No saved addresses.</p>}</section><section className="admin-panel"><h2>Order history</h2><div className="table-scroll"><table className="admin-table"><thead><tr><th>Order</th><th>Date</th><th>Value</th><th>Status</th><th>Payment</th></tr></thead><tbody>{customer.orders.map(o => <tr key={o.id}><td><Link href={'/admin/orders/' + o.id}>#{o.id.slice(-8).toUpperCase()}</Link></td><td>{indiaDate(o.createdAt)}</td><td>{rupees(o.totalAmount)}</td><td>{o.status}</td><td>{o.paymentStatus.replaceAll('_', ' ')}</td></tr>)}</tbody></table></div>{!customer.orders.length && <p className="muted">No orders yet.</p>}{customer.orders.length === 100 && <p className="muted">Showing the latest 100 orders.</p>}</section></div>
}
