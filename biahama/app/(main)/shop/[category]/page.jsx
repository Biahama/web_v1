import Link from 'next/link'
import { notFound } from 'next/navigation'
import CategoryTabs from '@/components/product/CategoryTabs'
import ProductGrid from '@/components/product/ProductGrid'

const VALID_CATEGORIES = ['tunics', 'shirts', 'kurtas', 'dresses', 'sets', 'trousers', 'jackets', 'wraps']

async function getProducts(category) {
  const base = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  try {
    const res = await fetch(`${base}/api/products?category=${category}`, { next: { revalidate: 60 } })
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

export async function generateMetadata({ params }) {
  const { category } = await params
  const title = category.charAt(0).toUpperCase() + category.slice(1)
  return { title: `${title} — Biahama` }
}

export default async function CategoryPage({ params }) {
  const { category } = await params

  if (!VALID_CATEGORIES.includes(category.toLowerCase())) {
    notFound()
  }

  const products    = await getProducts(category)
  const displayName = category.charAt(0).toUpperCase() + category.slice(1)

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ paddingLeft: 48, paddingRight: 48, paddingTop: 24, paddingBottom: 8 }}>
        <p className="text-xs tracking-widest" style={{ color: 'var(--gray)', fontFamily: 'Jost, sans-serif', fontWeight: 300 }}>
          <Link href="/" className="hover:opacity-60 transition-opacity">Home</Link>
          <span className="mx-2">·</span>
          <Link href="/shop" className="hover:opacity-60 transition-opacity">Shop</Link>
          <span className="mx-2">·</span>
          <span style={{ color: 'var(--black)' }}>{displayName}</span>
        </p>
      </div>

      {/* Hero — category name bottom-left overlay only */}
      <div
        className="relative overflow-hidden"
        style={{ height: '55vh', background: 'var(--light)' }}
      >
        {/* Placeholder area — swap for <Image> from Cloudinary */}
        <div className="absolute inset-0" style={{ background: 'var(--light)' }} />

        {/* Category name: bottom-left overlay */}
        <div
          className="absolute bottom-0 left-0"
          style={{ paddingLeft: 48, paddingBottom: 32 }}
        >
          <h1
            style={{
              fontFamily: 'Cormorant Garamond, serif',
              fontWeight: 300,
              fontStyle: 'italic',
              fontSize: 72,
              color: 'var(--black)',
              lineHeight: 1,
              letterSpacing: '-0.02em',
            }}
          >
            {displayName}
          </h1>
        </div>
      </div>

      {/* Category tabs */}
      <div style={{ paddingLeft: 48, paddingRight: 48, marginTop: 32, marginBottom: 40 }}>
        <CategoryTabs activeCategory={category} />
      </div>

      {/* Product grid */}
      <div style={{ paddingLeft: 48, paddingRight: 48, paddingBottom: 80 }}>
        <ProductGrid products={products} />
      </div>
    </div>
  )
}
