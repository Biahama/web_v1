import Link from 'next/link'
import ProductGrid from '@/components/product/ProductGrid'
import { getKurtasFromFilesystem } from '@/lib/kurtas'
import { prisma } from '@/lib/prisma'

export const metadata = { title: 'Collections — Biahama' }

const CATEGORIES = [
  { name: 'KURTA', slug: 'kurtas' },
  { name: 'SHIRTS', slug: 'shirts' },
  { name: 'TUNICS', slug: 'tunics' },
  { name: 'PANT', slug: 'trousers' },
]

async function getProducts(category) {
  // 1. Check if category is kurtas
  if (category.toLowerCase() === 'kurtas' || category.toLowerCase() === 'kurta') {
    return getKurtasFromFilesystem()
  }

  // 2. Query other categories from database
  const where = {
    isActive: true,
    category: { equals: category, mode: 'insensitive' },
  }

  let products = []
  try {
    products = await prisma.product.findMany({
      where,
      take: 50,
      orderBy: { createdAt: 'desc' },
      include: {
        images:   { where: { isPrimary: true }, take: 1 },
        variants: { select: { id: true, price: true, comparePrice: true, stockQty: true, color: true, colorHex: true, size: true } },
      },
    })
  } catch (err) {
    console.error("Local products query failed:", err)
    return []
  }

  return products.map(p => {
    const prices   = p.variants.map(v => v.price)
    const minPrice = prices.length ? Math.min(...prices) : 0
    const inStock  = p.variants.some(v => v.stockQty > 0)
    const firstInStockVariant = p.variants.find(v => v.stockQty > 0) || p.variants[0]

    return {
      id:             p.id,
      name:           p.name,
      slug:           p.slug,
      category:       p.category,
      image:          p.images[0]?.url ?? null,
      altText:        p.images[0]?.altText ?? p.name,
      price:          minPrice,
      inStock,
      firstVariantId: firstInStockVariant?.id ?? null,
      variants:       p.variants,
      colors:         [...new Map(p.variants.map(v => [v.color, { color: v.color, colorHex: v.colorHex }])).values()],
    }
  })
}

export default async function ShopPage({ searchParams }) {
  const params = await searchParams
  let category = params?.cat || 'kurtas'

  // Default to kurtas if cat is invalid or "all"
  const activeCatObj = CATEGORIES.find(c => c.slug === category) || CATEGORIES[0]
  const activeCategory = activeCatObj.slug
  const displayName = activeCatObj.name.charAt(0).toUpperCase() + activeCatObj.name.slice(1).toLowerCase()

  const products = await getProducts(activeCategory)

  return (
    <div>
      {/* Category subheader bar */}
      <div 
        style={{ 
          width: '100%', 
          display: 'flex', 
          justifyContent: 'center', 
          paddingTop: '14px', 
          paddingBottom: '14px', 
          borderBottom: '1px solid var(--border)', 
          background: '#f5f4f4' 
        }}
      >
        <div style={{ display: 'flex', gap: '40px' }}>
          {CATEGORIES.map(cat => {
            const isActive = activeCategory === cat.slug
            return (
              <Link
                key={cat.slug}
                href={`/shop?cat=${cat.slug}`}
                style={{
                  fontFamily: 'Jost, sans-serif',
                  fontSize: '10px',
                  fontWeight: isActive ? 500 : 300,
                  color: isActive ? 'var(--black)' : 'var(--gray)',
                  letterSpacing: '1.77px',
                  textTransform: 'uppercase',
                  borderBottom: isActive ? '1.5px solid var(--black)' : '1.5px solid transparent',
                  paddingBottom: '2px',
                  textDecoration: 'none',
                  opacity: isActive ? 1 : 0.7,
                  transition: 'opacity 0.2s',
                }}
              >
                {cat.name}
              </Link>
            )
          })}
        </div>
      </div>

      {/* Category centered title */}
      <div style={{ paddingLeft: 48, paddingRight: 48, paddingTop: 40, paddingBottom: 24 }} className="text-center">
        <h1
          style={{
            fontFamily: 'Cormorant Garamond, serif',
            fontWeight: 300,
            fontStyle: 'italic',
            fontSize: 'clamp(2rem, 5vw, 3rem)',
            color: 'var(--black)',
            lineHeight: 1,
          }}
        >
          {displayName}
        </h1>
      </div>

      {/* Product grid */}
      <div style={{ paddingLeft: 48, paddingRight: 48, paddingBottom: 80 }}>
        <ProductGrid products={products} category={activeCategory} />
      </div>
    </div>
  )
}
