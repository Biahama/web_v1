import ProductCard from '@/components/ui/ProductCard'

// Helper to generate mock products for UI demonstration when DB is empty
function getMockProducts(category) {
  const isLarge = category === 'shirts' || category === 'tunics' ? 3 : 10
  const mockList = []
  
  const titles = {
    kurtas: ['Ivory Linen Kurta', 'Sand Tunic Dress', 'Natural Linen Set', 'Stone Wrap Shirt', 'Ecru Wide Trousers', 'Oat Linen Jacket', 'Fluid Wrap Kurta', 'Architectural Linen Tunic', 'COS Style Kurta', 'Classic Linen Trousers'],
    shirts: ['Stone Wrap Shirt', 'Classic White Linen Shirt', 'Relaxed Fit Linen Shirt'],
    tunics: ['Sand Tunic Dress', 'Architectural Linen Tunic', 'Oat Tunic Coat'],
    trousers: ['Ecru Wide Trousers', 'Classic Linen Trousers', 'Sand Linen Pants', 'Natural Linen Shorts', 'Crop Linen Pants', 'Flowing White Trouser', 'Loose Linen Pant', 'Belted Linen Trouser', 'Pleated Sand Trousers', 'Tailored Linen Pants']
  }
  
  const activeTitles = titles[category] || titles['kurtas']

  for (let i = 1; i <= isLarge; i++) {
    const title = activeTitles[(i - 1) % activeTitles.length]
    mockList.push({
      id: `mock-${category}-${i}`,
      name: title,
      slug: `mock-${category}-${i}`,
      category: category === 'trousers' ? 'Pant' : category.charAt(0).toUpperCase() + category.slice(1, -1),
      price: 245000 + i * 20000,
      inStock: true,
      image: null,
      altText: 'Sample',
      firstVariantId: `mock-var-${i}`,
      variants: [
        { id: `mock-var-${i}`, price: 245000 + i * 20000, size: 'M', color: 'Natural', stockQty: 5 }
      ]
    })
  }
  return mockList
}

export default function ProductGrid({ products = [], category = 'all' }) {
  const cat = (category || 'all').toLowerCase()
  const isMock = products.length === 0
  const displayProducts = isMock ? getMockProducts(cat) : products

  // Shirts Category Layout (3 + 1)
  if (cat === 'shirts') {
    return (
      <>
        {isMock && (
          <p className="text-[10px] tracking-widest uppercase mb-8 text-center text-zinc-400 font-light" style={{ fontFamily: 'Jost, sans-serif' }}>
            Showing layout preview placeholders
          </p>
        )}
        {/* Desktop Layout */}
        <div className="hidden lg:block space-y-14">
          <div style={{
            aspectRatio: '9/16',
            width: '100%',
            background: '#f2f2f2',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            padding: '40px 32px'
          }}>
            <p style={{
              fontFamily: 'var(--font-ui)',
              fontSize: '10px',
              fontWeight: 500,
              letterSpacing: '2px',
              textTransform: 'uppercase',
              color: '#6f6f6f',
              marginBottom: '12px'
            }}>New Arrival</p>
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '32px',
              fontWeight: 300,
              fontStyle: 'italic',
              color: '#262626',
              lineHeight: '1.2'
            }}>Linen Column<br/>Shirts</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '32px 8px', marginTop: 'var(--space-5)' }}>
            {displayProducts.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        </div>

        {/* Mobile Layout */}
        <div className="block lg:hidden space-y-10">
          <div style={{
            aspectRatio: '9/16',
            width: '100%',
            background: '#f2f2f2',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            padding: '40px 32px'
          }}>
            <p style={{
              fontFamily: 'var(--font-ui)',
              fontSize: '10px',
              fontWeight: 500,
              letterSpacing: '2px',
              textTransform: 'uppercase',
              color: '#6f6f6f',
              marginBottom: '12px'
            }}>New Arrival</p>
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '32px',
              fontWeight: 300,
              fontStyle: 'italic',
              color: '#262626',
              lineHeight: '1.2'
            }}>Linen Column<br/>Shirts</h2>
          </div>
          <div className="grid grid-cols-2 mt-10" style={{ columnGap: 'var(--grid-col-gap)', rowGap: 'var(--grid-row-gap)' }}>
            {displayProducts.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        </div>
      </>
    )
  }

  // Kurta & Pant Asymmetric Layouts (10 + 1)
  if (cat === 'kurta' || cat === 'pant' || cat === 'kurtas' || cat === 'trousers' || cat === 'pants') {
    let bannerUrl = (cat === 'kurta' || cat === 'kurtas')
      ? 'https://images.unsplash.com/photo-1608748010899-18f300247112?auto=format&fit=crop&w=800&q=80'
      : 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&w=800&q=80'

    if (cat === 'trousers' || cat === 'pant' || cat === 'pants') {
      bannerUrl = 'https://res.cloudinary.com/dc30t7io2/image/upload/v1781913067/biahama/pants/grape-shake-volume-trouser-1.webp'
    } else {
      const productWithImage = displayProducts.find(p => {
        const imgs = p.images?.map(img => typeof img === 'string' ? img : img.url) || (p.image ? [p.image] : [])
        return imgs && imgs.length > 0
      })

      if (productWithImage) {
        const imgs = productWithImage.images?.map(img => typeof img === 'string' ? img : img.url) || (productWithImage.image ? [productWithImage.image] : [])
        bannerUrl = imgs[2] || imgs[0]
      }
    }

    return (
      <>
        {isMock && (
          <p className="text-[10px] tracking-widest uppercase mb-8 text-center text-zinc-400 font-light" style={{ fontFamily: 'Jost, sans-serif' }}>
            Showing layout preview placeholders
          </p>
        )}
        {/* Desktop Layout — Asymmetric Top (4 products left, 1 banner right) + Bottom (6 products below) */}
        <div className="hidden lg:block space-y-14">
          {/* Top Section: Asymmetric Layout (33% 33% 33%) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '32px 8px' }}>
            {displayProducts[0] && <ProductCard key={displayProducts[0].id} product={displayProducts[0]} priority={true} index={0} />}
            {displayProducts[1] && <ProductCard key={displayProducts[1].id} product={displayProducts[1]} priority={true} index={1} />}

            {/* Right side: 1 campaign banner */}
            <div
              className="relative bg-zinc-100 overflow-hidden"
              style={{ gridRow: 'span 2', width: '100%', height: '100%' }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={bannerUrl}
                alt="Campaign Banner"
                className="w-full h-full block"
                style={{ objectFit: 'cover', objectPosition: (cat === 'trousers' || cat === 'pant' || cat === 'pants') ? '50% 15%' : '50% 0%' }}
              />
            </div>

            {displayProducts[2] && <ProductCard key={displayProducts[2].id} product={displayProducts[2]} priority={true} index={2} />}
            {displayProducts[3] && <ProductCard key={displayProducts[3].id} product={displayProducts[3]} priority={true} index={3} />}
          </div>

          {/* Bottom Section: Remaining products in a standard 3-column grid */}
          {displayProducts.length > 4 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '32px 8px', marginTop: 'var(--space-5)' }}>
              {displayProducts.slice(4).map((p, i) => (
                <ProductCard key={p.id} product={p} index={i + 4} />
              ))}
            </div>
          )}
        </div>

        {/* Mobile Layout */}
        <div className="grid lg:hidden grid-cols-2" style={{ columnGap: 'var(--grid-col-gap)', rowGap: 'var(--grid-row-gap)' }}>
          {displayProducts.map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} />
          ))}
        </div>
      </>
    )
  }

  // Default Tunics & General Layout (3 + 0 / standard grid)
  return (
    <>
      {isMock && (
        <p className="text-[10px] tracking-widest uppercase mb-8 text-center text-zinc-400 font-light" style={{ fontFamily: 'var(--font-ui)' }}>
          Showing layout preview placeholders
        </p>
      )}
      <div className="grid grid-cols-2 lg:grid-cols-3" style={{ gap: '32px 8px' }}>
        {displayProducts.map((product, i) => (
          <ProductCard key={product.id} product={product} priority={i < 4} index={i} />
        ))}
      </div>
    </>
  )
}
