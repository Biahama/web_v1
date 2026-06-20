import Link from 'next/link'
import ProductGrid from '@/components/product/ProductGrid'
import FilterTabBar from '@/components/ui/FilterTabBar'
import { getKurtasFromFilesystem } from '@/lib/kurtas'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

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
  console.log('category:', activeCategory, 'products count:', products.length)

  return (
    <div style={{ paddingTop: '56px' }}>
      {/* Category subheader bar */}
      <FilterTabBar />

      {/* Category centered title */}
      <div 
        style={{ 
          paddingLeft: 'var(--space-5)', 
          paddingRight: 'var(--space-5)', 
          paddingTop: 'var(--space-5)', 
          paddingBottom: 'var(--space-3)' 
        }} 
        className="text-center"
      >
        <h1 className="biahama-heading">
          {displayName}
        </h1>
      </div>

      {/* Product grid */}
      <div 
        style={{ 
          paddingLeft: '16px', 
          paddingRight: '16px', 
          paddingBottom: 'var(--space-6)' 
        }}
      >
        <ProductGrid products={products} category={activeCategory} />
      </div>
    </div>
  )
}
