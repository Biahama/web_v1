// ============================================================
// /admin/products — the product list
// ============================================================
// A simple table of every product in the shop, newest first.
// Click "Edit" to change a product, or "+ Add product" to make
// a new one. Access is already checked by the /admin layout.
// ============================================================

import Link from 'next/link'
import { prisma } from '@/lib/prisma'

// Always show fresh data — never a cached copy of this page.
export const dynamic = 'force-dynamic'

// Prices are stored in paise; show them as rupees, Indian style.
// 245000 paise -> "₹2,450"
function rupees(paise) {
  return '₹' + (paise / 100).toLocaleString('en-IN')
}

export default async function AdminProductsPage() {
  const products = await prisma.product.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      images:   { orderBy: { sortOrder: 'asc' } },
      variants: { select: { price: true, stockQty: true } },
    },
  })

  return (
    <div style={{ fontFamily: "var(--font-jost), 'Jost', sans-serif", color: '#1A202C' }}>
      {/* Page header: title on the left, add button on the right */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 500, margin: 0 }}>Products</h1>
        <Link
          href="/admin/products/new"
          style={{
            background: '#1A202C', color: '#fff', padding: '10px 18px',
            borderRadius: 4, textDecoration: 'none', fontSize: 14,
          }}
        >
          + Add product
        </Link>
      </div>

      {products.length === 0 ? (
        // Friendly empty state for a brand-new shop
        <div style={{ padding: 48, textAlign: 'center', border: '1px dashed #cbd5e0', borderRadius: 8, color: '#4a5568' }}>
          <p style={{ fontSize: 16, margin: 0 }}>No products yet.</p>
          <p style={{ fontSize: 14, marginTop: 8 }}>
            Click <strong>+ Add product</strong> above to add your first one — no scripts needed.
          </p>
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '2px solid #e2e8f0', color: '#4a5568' }}>
              <th style={{ padding: '10px 8px' }}>Photo</th>
              <th style={{ padding: '10px 8px' }}>Name</th>
              <th style={{ padding: '10px 8px' }}>Category</th>
              <th style={{ padding: '10px 8px' }}>Price</th>
              <th style={{ padding: '10px 8px' }}>Stock</th>
              <th style={{ padding: '10px 8px' }}>Status</th>
              <th style={{ padding: '10px 8px' }}></th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              // The primary photo, or the first one if none is marked primary.
              const photo = p.images.find((img) => img.isPrimary) || p.images[0]

              // Cheapest and most expensive size, e.g. "₹2,250 – ₹2,450"
              const prices = p.variants.map((v) => v.price)
              const priceLabel = prices.length === 0
                ? '—'
                : Math.min(...prices) === Math.max(...prices)
                  ? rupees(prices[0])
                  : `${rupees(Math.min(...prices))} – ${rupees(Math.max(...prices))}`

              const totalStock = p.variants.reduce((sum, v) => sum + v.stockQty, 0)

              return (
                <tr key={p.id} style={{ borderBottom: '1px solid #edf2f7' }}>
                  <td style={{ padding: '8px' }}>
                    {photo ? (
                      // Plain <img>: these are small 40px thumbnails
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={photo.url}
                        alt={photo.altText || p.name}
                        width={40}
                        height={40}
                        style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }}
                      />
                    ) : (
                      <div style={{ width: 40, height: 40, background: '#edf2f7', borderRadius: 4 }} />
                    )}
                  </td>
                  <td style={{ padding: '8px', fontWeight: 500 }}>{p.name}</td>
                  <td style={{ padding: '8px', color: '#4a5568' }}>{p.category}</td>
                  <td style={{ padding: '8px' }}>{priceLabel}</td>
                  <td style={{ padding: '8px', color: totalStock === 0 ? '#c53030' : '#1A202C' }}>
                    {totalStock === 0 ? 'Out of stock' : totalStock}
                  </td>
                  <td style={{ padding: '8px' }}>
                    {/* Green pill = customers can see it; grey = hidden */}
                    <span
                      style={{
                        display: 'inline-block', padding: '2px 10px', borderRadius: 999, fontSize: 12,
                        background: p.isActive ? '#c6f6d5' : '#e2e8f0',
                        color:      p.isActive ? '#22543d' : '#4a5568',
                      }}
                    >
                      {p.isActive ? 'Active' : 'Hidden'}
                    </span>
                  </td>
                  <td style={{ padding: '8px' }}>
                    <Link href={`/admin/products/${p.id}`} style={{ color: '#1A202C', textDecoration: 'underline' }}>
                      Edit
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
