import Link from 'next/link'
import Image from 'next/image'
import { STOREFRONT_COLLECTIONS } from '@/lib/collections'
import ProductCard from '@/components/ui/ProductCard'

// collectionSettings (from the admin panel, per category):
//   bannerSide:  'right' or 'left' — which side of the product
//                cards the big campaign banner sits on.
//   bannerImage: a custom banner photo URL. '' means "automatic":
//                pick a product photo (the old behaviour).
// The older bannerSide prop still works, but collectionSettings
// wins if both are given.
export default function ProductGrid({
  products = [],
  category = 'all',
  bannerSide,
  collectionSettings,
}) {
  const banner = {
    bannerSide: collectionSettings?.bannerSide ?? bannerSide ?? 'right',
    bannerImage: collectionSettings?.bannerImage ?? '',
  }
  const cat = (category || 'all').toLowerCase()
  const displayProducts = products
  if (!products.length) return (
    <div className="collection-empty" role="status">
      <p>This collection is coming soon.</p>
      <Link href="/shop?cat=kurtas">Explore available pieces →</Link>
    </div>
  )

  // An actual campaign image replaces the old empty, screen-height block.
  if (cat === 'shirts') {
    const campaign = banner.bannerImage || STOREFRONT_COLLECTIONS.find(c => c.slug === 'shirts').image
    return <>
      <div className="collection-campaign"><Image src={campaign} alt="The Biahama linen shirt collection" fill sizes="100vw" /><div><p className="eyebrow">The linen collection</p><h2>Shirts, with ease.</h2></div></div>
      <div className="grid grid-cols-2 lg:grid-cols-3" style={{ columnGap: 'var(--grid-col-gap)', rowGap: 'var(--grid-row-gap)' }}>
        {displayProducts.map((product, i) => <ProductCard key={product.id} product={product} priority={i < 3} />)}
      </div>
    </>
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

    // If the admins uploaded their own banner photo for this
    // category, it wins over the automatic product photo above.
    if (typeof banner.bannerImage === 'string' && banner.bannerImage.trim() !== '') {
      bannerUrl = banner.bannerImage
    }

    return (
      <>
        {/* Desktop Layout — matches the approved design.
            Both KURTA and PANT pages use the same layout:
            4-column grid. Left = 2x2 product cards.
            Right = one banner spanning 2 columns x 2 rows,
            so the banner box is ~4:5 overall (2 cards wide,
            2 rows tall) exactly like the reference picture. */}
        <div className="hidden lg:block space-y-14">
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
            columnGap: 'var(--grid-col-gap)', rowGap: 'var(--grid-row-gap)'
          }}>
            {/* The three pieces of the top row: two product cards and
                one big campaign banner. The admin panel decides whether
                the banner goes on the LEFT or the RIGHT of the cards —
                we just change the order they are placed into the grid. */}
            {(() => {
              const firstTwoCards = (
                <>
                  {displayProducts[0] && <ProductCard key={displayProducts[0].id} product={displayProducts[0]} priority={true} index={0} />}
                  {displayProducts[1] && <ProductCard key={displayProducts[1].id} product={displayProducts[1]} priority={true} index={1} />}
                </>
              )
              const campaignBanner = (
                <div
                  key="campaign-banner"
                  className="relative bg-zinc-100 overflow-hidden"
                  style={{ gridColumn: 'span 2', gridRow: 'span 2', width: '100%', height: '100%' }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={bannerUrl}
                    alt="Campaign Banner"
                    className="w-full h-full block"
                    style={{ objectFit: 'cover', objectPosition: (cat === 'trousers' || cat === 'pant' || cat === 'pants') ? '50% 15%' : '50% 0%', position: 'absolute', inset: 0 }}
                  />
                </div>
              )
              // banner first = banner on the left, cards flow to its right
              return banner.bannerSide === 'left'
                ? <>{campaignBanner}{firstTwoCards}</>
                : <>{firstTwoCards}{campaignBanner}</>
            })()}

            {displayProducts[2] && <ProductCard key={displayProducts[2].id} product={displayProducts[2]} priority={true} index={2} />}
            {displayProducts[3] && <ProductCard key={displayProducts[3].id} product={displayProducts[3]} priority={true} index={3} />}
          </div>

          {/* Bottom Section: Remaining products in a standard 3-column grid */}
          {displayProducts.length > 4 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', columnGap: 'var(--grid-col-gap)', rowGap: 'var(--grid-row-gap)', marginTop: 'var(--space-5)' }}>
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
      <div className="grid grid-cols-2 lg:grid-cols-3" style={{ columnGap: 'var(--grid-col-gap)', rowGap: 'var(--grid-row-gap)' }}>
        {displayProducts.map((product, i) => (
          <ProductCard key={product.id} product={product} priority={i < 4} index={i} />
        ))}
      </div>
    </>
  )
}
