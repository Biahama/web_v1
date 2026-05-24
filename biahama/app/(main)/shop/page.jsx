import Link from 'next/link'
import ProductGrid from '@/components/product/ProductGrid'

export const metadata = { title: 'Collections — Biahama' }

const CATEGORIES = [
  { name: 'KURTA', slug: 'kurtas' },
  { name: 'SHIRTS', slug: 'shirts' },
  { name: 'TUNICS', slug: 'tunics' },
  { name: 'PANT', slug: 'trousers' },
]

async function getProducts(category) {
  const base = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const url = `${base}/api/products?category=${category}`

  try {
    const res = await fetch(url, { next: { revalidate: 60 } })
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
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
