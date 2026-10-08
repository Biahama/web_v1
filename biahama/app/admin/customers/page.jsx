import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'
import { rupees, indiaDate } from '@/lib/admin-insights'

export const dynamic = 'force-dynamic'
export default async function CustomersPage({ searchParams }) {
  await requireAdmin()
  const params = await searchParams
  const q = typeof params?.q === 'string' ? params.q.trim().slice(0, 100) : ''
  const page = Math.max(1, Math.min(10000, parseInt(params?.page, 10) || 1))
  const where = q ? { OR: ['name', 'email', 'phone'].map(field => ({ [field]: { contains: q, mode: 'insensitive' } })) } : {}
  const [count, customers] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * 30, take: 30, select: { id: true, name: true, email: true, phone: true, createdAt: true, _count: { select: { orders: true } }, orders: { where: { paymentStatus: 'paid', status: { not: 'cancelled' } }, select: { totalAmount: true } } } }),
  ])
  return <div className="admin-page"><header className="admin-page-header"><div><p className="eyebrow">The people behind the orders</p><h1>Customers</h1><p className="muted">{count} {count === 1 ? 'customer' : 'customers'}{q && ' matching your search'}</p></div></header>
    <form className="admin-toolbar"><label className="search-field">Find a customer<input name="q" type="search" defaultValue={q} placeholder="Name, email, or mobile" /></label><button className="secondary-action">Search</button>{q && <Link className="text-action" href="/admin/customers">Clear</Link>}</form>
    <div className="table-scroll"><table className="admin-table"><thead><tr><th>Customer</th><th>Mobile</th><th>Orders</th><th>Paid order value</th><th>Joined</th><th><span className="sr-only">Open customer</span></th></tr></thead><tbody>{customers.map(customer => <tr key={customer.id}><td><Link href={'/admin/customers/' + customer.id}>{customer.name || 'Name not added'}</Link><small>{customer.email}</small></td><td>{customer.phone || '—'}</td><td>{customer._count.orders}</td><td>{rupees(customer.orders.reduce((sum, o) => sum + o.totalAmount, 0))}</td><td>{indiaDate(customer.createdAt)}</td><td><Link className="text-action" href={'/admin/customers/' + customer.id}>View →</Link></td></tr>)}</tbody></table></div>
    {!customers.length && <div className="quiet-empty">No customers found.</div>}
    <nav className="pagination" aria-label="Customer pages">{page > 1 && <Link href={'?q=' + encodeURIComponent(q) + '&page=' + (page - 1)}>← Previous</Link>}<span>Page {page}</span>{page * 30 < count && <Link href={'?q=' + encodeURIComponent(q) + '&page=' + (page + 1)}>Next →</Link>}</nav>
    <p className="muted">Paid order value includes shipping and discounts; excludes cancelled, refunded, and unpaid orders. Manual return refunds are not deducted. This is not a settlement report.</p>
  </div>
}
