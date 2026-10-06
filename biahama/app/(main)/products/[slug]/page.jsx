import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import ProductDetailClient from '@/components/product/ProductDetailClient'
import { getSiteSettings } from '@/lib/site-settings'

export const revalidate = 3600

export async function generateStaticParams() {
  // This runs while Vercel BUILDS the site. If the database is
  // unreachable at that moment (e.g. Supabase paused it), we must
  // not crash the whole deploy — return an empty list instead.
  // Product pages are then simply built on first visit, once the
  // database is back.
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true }, select: { slug: true }
    })
    return products.map(p => ({ slug: p.slug }))
  } catch (error) {
    console.error(
      '[BUILD WARNING] Could not reach the database while building product pages. ' +
      'The deploy will continue; pages will be generated on first visit. ' +
      'Check if the Supabase project is paused. Details: ' + error.message
    )
    return []
  }
}

// Look up one product (with its photos and size options) in the
// database. Every category uses this same path — no special cases.
async function getProduct(slug) {
  return prisma.product.findUnique({
    where: { slug },
    include: {
      images:   { orderBy: { sortOrder: 'asc' } },
      variants: { orderBy: { size: 'asc' } },
    },
  })
}

export async function generateMetadata({ params }) {
  const { slug } = await params
  const product = await getProduct(slug)

  if (!product?.isActive) {
    return { title: 'Product not found', robots: { index: false, follow: false } }
  }

  return {
    title: product.metaTitle || product.name,
    alternates: { canonical: `/products/${slug}` },
    openGraph: { title: product.name, description: product.metaDescription || product.description || 'Luxury linen crafted in India.', url: `/products/${slug}`, images: product.images.slice(0, 1).map(image => ({ url: image.url, alt: image.altText || product.name })) },
    description: product.metaDescription || product.description || 'Luxury Linen crafted in India.',
  }
}

export default async function ProductDetailPage({ params }) {
  const { slug } = await params
  const product = await getProduct(slug)

  // No such product in the database -> show the normal 404 page
  if (!product || !product.isActive) {
    notFound()
  }

  // Admin panel settings for this page (button text, fast checkout
  // on/off) — edited under Admin -> Product page (PDP).
  const settings = await getSiteSettings()

  const prices = product.variants.map(variant => variant.price / 100)
  const structured = { '@context': 'https://schema.org', '@type': 'Product', name: product.name, description: product.description || undefined, image: product.images.map(image => image.url), brand: { '@type': 'Brand', name: 'Biahama' }, offers: prices.length ? { '@type': 'AggregateOffer', priceCurrency: 'INR', lowPrice: Math.min(...prices), highPrice: Math.max(...prices), offerCount: prices.length, availability: product.variants.some(variant => variant.stockQty > 0) ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock', url: `https://www.biahama.com/products/${product.slug}` } : undefined }
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structured).replace(/</g, '\\u003c') }} /><ProductDetailClient product={product} pdpSettings={settings.pdp} /></>
}
