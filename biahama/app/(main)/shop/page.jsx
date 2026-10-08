import ProductGrid from '@/components/product/ProductGrid'
import FilterTabBar from '@/components/ui/FilterTabBar'
import { prisma } from '@/lib/prisma'
import { logError } from '@/lib/logger'
import { getSiteSettings } from '@/lib/site-settings'
import Link from 'next/link'
import { filterCatalog } from '@/lib/catalog-filters'

export const revalidate = 3600

export async function generateMetadata({ searchParams }) {
  const params = await searchParams
  const category = CATEGORIES.find(c => c.slug === params?.cat) || CATEGORIES[0]
  if (params?.q) return { title: 'Search results', robots: { index: false, follow: true } }
  return { title: `${category.name} Collection`, alternates: { canonical: `/shop?cat=${category.slug}` } }
}

const CATEGORIES = [
  { name: 'KURTA', slug: 'kurtas' },
  { name: 'SHIRTS', slug: 'shirts' },
  { name: 'TUNICS', slug: 'tunics' },
  { name: 'PANT', slug: 'trousers' },
]

// Turn a raw database product into the simple shape the product
// cards expect (one price, one photo, in-stock flag, ...).
function shapeProduct(p) {
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
    images:         p.images,
    altText:        p.images[0]?.altText ?? p.name,
    price:          minPrice,
    inStock,
    firstVariantId: firstInStockVariant?.id ?? null,
    variants:       p.variants,
    colors:         [...new Map(p.variants.map(v => [v.color, { color: v.color, colorHex: v.colorHex }])).values()],
  }
}

// The photos + size options every product listing query needs.
const PRODUCT_INCLUDE = {
  images:   { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], take: 2 },
  variants: { select: { id: true, price: true, comparePrice: true, stockQty: true, color: true, colorHex: true, size: true } },
}

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
      include: PRODUCT_INCLUDE,
    })
  } catch (err) {
    // Record it in the ErrorLog table (with a timestamp) so this can
    // never fail invisibly again — when this happens, the shop shows
    // "an honest empty state" instead of real products.
    await logError('shop page — load products', err, { category })
    return []
  }

  return products.map(shapeProduct)
}

// The navbar search box sends people to /shop?q=... — this looks
// up matching product names across ALL categories.
async function searchProducts(q) {
  let products = []
  try {
    products = await prisma.product.findMany({
      where: {
        isActive: true,
        name: { contains: q, mode: 'insensitive' },
      },
      take: 50,
      orderBy: { createdAt: 'desc' },
      include: PRODUCT_INCLUDE,
    })
  } catch (err) {
    await logError('shop page — search products', err, { q })
    return []
  }

  return products.map(shapeProduct)
}

export default async function ShopPage({ searchParams }) {
  const params = await searchParams
  let category = params?.cat || 'kurtas'
  // A search from the navbar arrives as /shop?q=...
  const q = typeof params?.q === 'string' ? params.q.trim() : ''

  // Default to kurtas if cat is invalid or "all"
  const activeCatObj = CATEGORIES.find(c => c.slug === category) || CATEGORIES[0]
  const activeCategory = activeCatObj.slug
  const displayName = activeCatObj.name.charAt(0).toUpperCase() + activeCatObj.name.slice(1).toLowerCase()

  // Searching? Show matching products from every category instead
  // of one category's collection.
  const searching = q !== ''
  const catalog = searching ? await searchProducts(q) : await getProducts(activeCategory)
  const filters = {
    size: typeof params?.size === 'string' ? params.size : '',
    color: typeof params?.color === 'string' ? params.color : '',
    availability: params?.availability === 'in-stock' ? 'in-stock' : '',
    sort: ['price-asc', 'price-desc', 'name'].includes(params?.sort) ? params.sort : 'newest',
  }
  const products = filterCatalog(catalog, filters)
  const sizes = [...new Set(catalog.flatMap(p => p.variants.map(v => v.size)))]
  const colors = [...new Set(catalog.flatMap(p => p.variants.map(v => v.color)))].sort()
  const filtered = Boolean(filters.size || filters.color || filters.availability)


  // Admin panel settings: per-category banner side + optional
  // custom banner photo (edited under Admin -> Collections).
  const settings = await getSiteSettings()
  const collectionSettings =
    settings.collections[activeCategory] ??
    // Fallback for anything unexpected: the old site-wide setting.
    { bannerSide: settings.layout.collectionBannerSide, bannerImage: '' }

  return (
    <div>
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
        {/* The title uses the same UI font and letter spacing as the category tabs above it */}
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
          {searching ? `Results for "${q}"` : displayName}
        </h1>
      </div>

      {catalog.length > 0 && <form className="catalog-controls" aria-label="Collection filters">
        <input type="hidden" name="cat" value={activeCategory} />{q && <input type="hidden" name="q" value={q} />}
        <p className="muted">{products.length} {products.length === 1 ? 'piece' : 'pieces'}</p>
        <label>Size<select name="size" defaultValue={filters.size}><option value="">All sizes</option>{sizes.map(size => <option key={size}>{size}</option>)}</select></label>
        <label>Colour<select name="color" defaultValue={filters.color}><option value="">All colours</option>{colors.map(color => <option key={color}>{color}</option>)}</select></label>
        <label>Availability<select name="availability" defaultValue={filters.availability}><option value="">All pieces</option><option value="in-stock">In stock</option></select></label>
        <label>Sort by<select name="sort" defaultValue={filters.sort}><option value="newest">Newest</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option><option value="name">Name</option></select></label>
        <button className="secondary-action">Apply</button>
        {filtered && <Link className="text-action" href={'/shop?cat=' + activeCategory + (q ? '&q=' + encodeURIComponent(q) : '')}>Clear filters</Link>}
      </form>}
      {filtered && products.length === 0 ? <div className="collection-empty"><p>No pieces match these filters.</p><Link href={'/shop?cat=' + activeCategory + (q ? '&q=' + encodeURIComponent(q) : '')}>Clear filters →</Link></div> : <>
      {/* Product grid */}
      <div
        style={{
          paddingLeft: '16px',
          paddingRight: '16px',
          paddingBottom: 'var(--space-6)'
        }}
      >
        {searching ? (
          products.length === 0 ? (
            /* Friendly empty state — no placeholders during a search */
            <p
              className="text-center"
              style={{ fontFamily: 'var(--font-ui)', fontSize: 15, color: '#6f6f6f', padding: '48px 16px' }}
            >
              Nothing found for &ldquo;{q}&rdquo; — try another word.
            </p>
          ) : (
            /* category='all' -> the plain grid layout, no banner */
            <ProductGrid products={products} category="all" />
          )
        ) : (
          <ProductGrid
            products={products}
            category={activeCategory}
            collectionSettings={collectionSettings}
          />
        )}
      </div>
      </>}
    </div>
  )
}
