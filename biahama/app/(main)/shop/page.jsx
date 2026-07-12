import Link from 'next/link'
import ProductGrid from '@/components/product/ProductGrid'
import FilterTabBar from '@/components/ui/FilterTabBar'
import { prisma } from '@/lib/prisma'
import { logError } from '@/lib/logger'

export const revalidate = 3600

export const metadata = { title: 'Collections — Biahama' }

const CATEGORIES = [
  { name: 'KURTA', slug: 'kurtas' },
  { name: 'SHIRTS', slug: 'shirts' },
  { name: 'TUNICS', slug: 'tunics' },
  { name: 'PANT', slug: 'trousers' },
]

async function getProducts(category) {
  // Every category (kurtas included) comes from the database.
  // Shop links use plural names ("kurtas") but some products are
  // stored singular ("Kurta"), so we accept both spellings.
  const categoryForms = [category, category.replace(/s$/i, '')]

  const where = {
    isActive: true,
    category: { in: categoryForms, mode: 'insensitive' },
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
    // Record it in the ErrorLog table (with a timestamp) so this can
    // never fail invisibly again — when this happens, the shop shows
    // "layout preview placeholders" instead of real products.
    await logError('shop page — load products', err, { category })
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
        {/* The title uses the same Jost font and letter spacing as the category tabs above it */}
        <h1
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize: '26px',
            fontWeight: 400,
            letterSpacing: '0.177em',
            color: '#404040',
            margin: 0,
          }}
        >
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
