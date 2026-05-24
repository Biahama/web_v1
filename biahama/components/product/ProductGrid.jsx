import ProductCard from '@/components/ui/ProductCard'

const PLACEHOLDER_NAMES = [
  'Ivory Linen Kurta',
  'Sand Tunic Dress',
  'Natural Linen Set',
]

function PlaceholderCard({ name }) {
  return (
    <div>
      <div
        className="flex items-center justify-center animate-pulse"
        style={{ aspectRatio: '4/5', background: 'var(--light)' }}
      >
        <span
          className="text-center px-4"
          style={{
            fontFamily: 'Cormorant Garamond, serif',
            fontWeight: 300,
            fontStyle: 'italic',
            fontSize: '1rem',
            color: 'var(--gray)',
            opacity: 0.5,
          }}
        >
          {name}
        </span>
      </div>
      <div className="mt-3 space-y-1.5">
        <div style={{ height: 10, width: 60, background: 'var(--light)', borderRadius: 2 }} />
        <div style={{ height: 12, width: 120, background: 'var(--light)', borderRadius: 2 }} />
        <div style={{ height: 12, width: 80, background: 'var(--border)', borderRadius: 2 }} />
      </div>
    </div>
  )
}

export default function ProductGrid({ products = [], category = 'all' }) {
  const cat = (category || 'all').toLowerCase()

  if (!products.length) {
    return (
      <div>
        <p
          className="text-xs tracking-widest uppercase mb-8"
          style={{ color: 'var(--gray)', fontFamily: 'Jost, sans-serif', fontWeight: 300 }}
        >
          No products found — add products to see them here
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-4 lg:gap-x-6 gap-y-10 lg:gap-y-14">
          {PLACEHOLDER_NAMES.map(name => (
            <PlaceholderCard key={name} name={name} />
          ))}
        </div>
      </div>
    )
  }

  // Shirts Category Layout (3 + 1)
  if (cat === 'shirts') {
    return (
      <>
        {/* Desktop Layout */}
        <div className="hidden lg:block space-y-14">
          <div className="relative w-full overflow-hidden" style={{ aspectRatio: '16/7', background: 'var(--light)' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=1200&h=525&q=80"
              alt="Shirts Campaign"
              className="object-cover w-full h-full"
            />
          </div>
          <div className="grid grid-cols-3 gap-x-6 gap-y-14">
            {products.slice(0, 3).map(p => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>

        {/* Mobile Layout */}
        <div className="block lg:hidden space-y-10">
          <div className="relative w-full overflow-hidden" style={{ aspectRatio: '16/9', background: 'var(--light)' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=600&h=337&q=80"
              alt="Shirts Campaign"
              className="object-cover w-full h-full"
            />
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-10">
            {products.slice(0, 3).map(p => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </>
    )
  }

  // Kurta & Pant Asymmetric Layouts (10 + 1)
  if (cat === 'kurta' || cat === 'pant' || cat === 'kurtas' || cat === 'trousers' || cat === 'pants') {
    const bannerUrl = (cat === 'kurta' || cat === 'kurtas')
      ? 'https://images.unsplash.com/photo-1608748010899-18f300247112?auto=format&fit=crop&w=800&q=80'
      : 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&w=800&q=80'

    return (
      <>
        {/* Desktop Layout */}
        <div className="hidden lg:grid grid-cols-3 gap-x-6 gap-y-14">
          {/* Left 4 products (2 columns spanning 2 rows) */}
          <div className="col-span-2 grid grid-cols-2 gap-x-6 gap-y-14">
            {products.slice(0, 4).map((p, i) => (
              <ProductCard key={p.id} product={p} priority={i < 4} />
            ))}
          </div>

          {/* Right Banner (Col 3, Spans 2 Rows height) */}
          <div className="relative w-full h-full min-h-[500px]" style={{ gridColumn: '3', gridRow: '1 / span 2', background: 'var(--light)' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={bannerUrl}
              alt="Campaign Banner"
              className="object-cover w-full h-full absolute inset-0"
            />
          </div>

          {/* Remaining 6 products underneath */}
          {products.slice(4, 10).map(p => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>

        {/* Mobile Layout */}
        <div className="grid lg:hidden grid-cols-2 gap-x-4 gap-y-10">
          {products.map(p => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </>
    )
  }

  // Default Tunics & General Layout (3 + 0 / standard grid)
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-4 lg:gap-x-6 gap-y-10 lg:gap-y-14">
      {products.map((product, i) => (
        <ProductCard key={product.id} product={product} priority={i < 4} />
      ))}
    </div>
  )
}
