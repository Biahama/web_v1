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
          <div className="relative w-full overflow-hidden" style={{ aspectRatio: '16/7', background: 'var(--light)' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=1200&h=525&q=80"
              alt="Shirts Campaign"
              className="object-cover w-full h-full"
            />
          </div>
          <div className="biahama-grid" style={{ marginTop: 'var(--space-5)' }}>
            {displayProducts.map(p => (
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
          <div className="grid grid-cols-2 mt-10" style={{ columnGap: 'var(--grid-col-gap)', rowGap: 'var(--grid-row-gap)' }}>
            {displayProducts.map(p => (
              <ProductCard key={p.id} product={p} />
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

    const productWithImage = displayProducts.find(p => {
      const imgs = p.images?.map(img => typeof img === 'string' ? img : img.url) || (p.image ? [p.image] : [])
      return imgs && imgs.length > 0
    })

    if (productWithImage) {
      const imgs = productWithImage.images?.map(img => typeof img === 'string' ? img : img.url) || (productWithImage.image ? [productWithImage.image] : [])
      bannerUrl = imgs[0]
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
          {/* Top Section: Asymmetric Layout (25% 25% 50%) */}
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 2fr', columnGap: 'var(--grid-col-gap)', rowGap: 'var(--grid-row-gap)' }}>
            {displayProducts[0] && <ProductCard key={displayProducts[0].id} product={displayProducts[0]} priority={true} />}
            {displayProducts[1] && <ProductCard key={displayProducts[1].id} product={displayProducts[1]} priority={true} />}

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
                style={{ objectFit: 'cover', objectPosition: '50% 0%' }}
              />
            </div>

            {displayProducts[2] && <ProductCard key={displayProducts[2].id} product={displayProducts[2]} priority={true} />}
            {displayProducts[3] && <ProductCard key={displayProducts[3].id} product={displayProducts[3]} priority={true} />}
          </div>

          {/* Bottom Section: Remaining products in a standard 3-column grid */}
          {displayProducts.length > 4 && (
            <div className="biahama-grid" style={{ marginTop: 'var(--space-5)' }}>
              {displayProducts.slice(4).map(p => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>

        {/* Mobile Layout */}
        <div className="grid lg:hidden grid-cols-2" style={{ columnGap: 'var(--grid-col-gap)', rowGap: 'var(--grid-row-gap)' }}>
          {displayProducts.map(p => (
            <ProductCard key={p.id} product={p} />
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
      <div className="grid grid-cols-2 lg:biahama-grid" style={{ columnGap: 'var(--grid-col-gap)', rowGap: 'var(--grid-row-gap)' }}>
        {displayProducts.map((product, i) => (
          <ProductCard key={product.id} product={product} priority={i < 4} />
        ))}
      </div>
    </>
  )
}
