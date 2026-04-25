import ProductCard from '@/components/ui/ProductCard'

const PLACEHOLDER_NAMES = [
  'Ivory Linen Kurta',
  'Sand Tunic Dress',
  'Natural Linen Set',
  'Stone Wrap Shirt',
  'Ecru Wide Trousers',
  'Oat Linen Jacket',
]

function PlaceholderCard({ name }) {
  return (
    <div>
      <div
        className="flex items-center justify-center"
        style={{ aspectRatio: '3/4', background: '#e8e4de' }}
      >
        <span
          className="text-center px-4"
          style={{
            fontFamily: 'Cormorant Garamond, serif',
            fontWeight: 300,
            fontStyle: 'italic',
            fontSize: '1rem',
            color: '#c4bfb9',
          }}
        >
          {name}
        </span>
      </div>
      <div className="mt-3 space-y-1">
        <div style={{ height: 10, width: 60, background: '#e8e4de', borderRadius: 2 }} />
        <div style={{ height: 12, width: 120, background: '#e8e4de', borderRadius: 2 }} />
        <div style={{ height: 12, width: 80, background: '#ddd9d3', borderRadius: 2 }} />
      </div>
    </div>
  )
}

export default function ProductGrid({ products = [] }) {
  if (!products.length) {
    return (
      <div>
        <p
          className="text-xs tracking-widest uppercase mb-8"
          style={{ color: 'var(--gray)', fontFamily: 'Jost, sans-serif', fontWeight: 300 }}
        >
          No products found — add products to see them here
        </p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:gap-x-6 md:gap-y-14">
          {PLACEHOLDER_NAMES.map(name => (
            <PlaceholderCard key={name} name={name} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:gap-x-6 md:gap-y-14">
      {products.map((product, i) => (
        <ProductCard key={product.id} product={product} priority={i < 4} />
      ))}
    </div>
  )
}
