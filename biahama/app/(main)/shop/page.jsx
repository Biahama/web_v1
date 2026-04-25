import CategoryTabs from '@/components/product/CategoryTabs'
import ProductGrid from '@/components/product/ProductGrid'

export const metadata = { title: 'Shop — Biahama' }

async function getProducts(category) {
  const base = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const url  = category
    ? `${base}/api/products?category=${category}`
    : `${base}/api/products`

  try {
    const res = await fetch(url, { next: { revalidate: 60 } })
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

export default async function ShopPage({ searchParams }) {
  const params   = await searchParams
  const category = params?.cat || null
  const products = await getProducts(category)

  const title = category
    ? category.charAt(0).toUpperCase() + category.slice(1)
    : 'Categories'

  return (
    <div>
      {/* Title */}
      <div style={{ paddingLeft: 48, paddingRight: 48, paddingTop: 32, paddingBottom: 24 }}>
        <h1
          style={{
            fontFamily: 'Cormorant Garamond, serif',
            fontWeight: 300,
            fontStyle: 'italic',
            fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
            color: 'var(--black)',
            lineHeight: 1,
          }}
        >
          {title}
        </h1>
      </div>

      {/* Category tabs */}
      <div style={{ paddingLeft: 48, paddingRight: 48, marginBottom: 40 }}>
        <CategoryTabs activeCategory={category} />
      </div>

      {/* Product grid */}
      <div style={{ paddingLeft: 48, paddingRight: 48, paddingBottom: 80 }}>
        <ProductGrid products={products} />
      </div>
    </div>
  )
}
