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
      <div className="w-full flex justify-center py-3 border-b border-zinc-200" style={{ background: '#f5f4f4' }}>
        <div className="flex gap-8 md:gap-14">
          {CATEGORIES.map(cat => {
            const isActive = activeCategory === cat.slug
            return (
              <Link
                key={cat.slug}
                href={`/shop?cat=${cat.slug}`}
                className="text-[10px] tracking-widest uppercase transition-opacity hover:opacity-100"
                style={{
                  fontFamily: 'Jost, sans-serif',
                  fontWeight: isActive ? 500 : 300,
                  color: isActive ? 'var(--black)' : 'var(--gray)',
                  letterSpacing: '1.77px',
                  borderBottom: isActive ? '1px solid var(--black)' : '1px solid transparent',
                  paddingBottom: '2px',
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
