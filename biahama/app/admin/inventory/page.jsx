import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'
import StockEditor from '@/components/admin/StockEditor'

export const dynamic = 'force-dynamic'
export default async function InventoryPage({ searchParams }) {
  await requireAdmin()
  const params = await searchParams
  const filter = ['low', 'out', 'attention'].includes(params?.filter) ? params.filter : 'all'
  const q = typeof params?.q === 'string' ? params.q.trim().slice(0, 100) : ''
  const page = Math.max(1, Math.min(10000, parseInt(params?.page, 10) || 1))
  const where = {
    ...(filter === 'attention' ? { stockQty: { lte: 5 } } : filter === 'low' ? { stockQty: { gt: 0, lte: 5 } } : filter === 'out' ? { stockQty: 0 } : {}),
    ...(q ? { OR: [{ sku: { contains: q, mode: 'insensitive' } }, { product: { name: { contains: q, mode: 'insensitive' } } }] } : {}),
  }
  const [count, variants] = await Promise.all([prisma.productVariant.count({ where }), prisma.productVariant.findMany({ where, orderBy: [{ stockQty: 'asc' }, { sku: 'asc' }], skip: (page - 1) * 40, take: 40, include: { product: { select: { id: true, name: true, isActive: true } } } })])
  return <div className="admin-page"><header className="admin-page-header"><div><p className="eyebrow">Every size, every colour</p><h1>Inventory</h1><p className="muted">Available-to-sell units, after checkout reservations. Low stock means 1–5 units.</p></div><Link className="secondary-action" href="/admin/products/new">Add a product</Link></header>
    <nav className="admin-filters" aria-label="Inventory filters">{[['attention', 'Needs replenishment'], ['all', 'All variants'], ['low', 'Low stock'], ['out', 'Out of stock']].map(([key, label]) => <Link key={key} aria-current={key === filter ? 'page' : undefined} href={'?filter=' + key + '&q=' + encodeURIComponent(q)}>{label}</Link>)}</nav>
    <form className="admin-toolbar"><input type="hidden" name="filter" value={filter} /><label className="search-field">Find a product or SKU<input name="q" type="search" defaultValue={q} placeholder="Search inventory" /></label><button className="secondary-action">Search</button></form>
    <p className="muted">{count} variants</p><div className="table-scroll"><table className="admin-table"><thead><tr><th>Product</th><th>SKU</th><th>Variant</th><th>Availability</th><th>Available stock</th></tr></thead><tbody>{variants.map(v => <tr key={v.id}><td><Link href={'/admin/products/' + v.product.id}>{v.product.name}</Link><small>{v.product.isActive ? 'Published' : 'Hidden from storefront'}</small></td><td>{v.sku}</td><td>{v.size} / {v.color}</td><td><span className={'subtle-badge ' + (v.stockQty <= 5 ? 'attention' : '')}>{v.stockQty === 0 ? 'Out of stock' : v.stockQty <= 5 ? 'Low stock' : 'In stock'}</span></td><td><StockEditor key={v.id + ':' + v.stockQty} variantId={v.id} stockQty={v.stockQty} sku={v.sku} /></td></tr>)}</tbody></table></div>
    {!variants.length && <div className="quiet-empty">No variants match this view.</div>}<nav className="pagination" aria-label="Inventory pages">{page > 1 && <Link href={'?filter=' + filter + '&q=' + encodeURIComponent(q) + '&page=' + (page - 1)}>← Previous</Link>}<span>Page {page}</span>{page * 40 < count && <Link href={'?filter=' + filter + '&q=' + encodeURIComponent(q) + '&page=' + (page + 1)}>Next →</Link>}</nav>
    <p className="muted">Enter the available quantity, excluding units reserved for existing orders. Stock changes are checked against the quantity you last loaded.</p>
  </div>
}
