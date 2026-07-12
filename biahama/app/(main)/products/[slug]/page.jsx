import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import ProductDetailClient from '@/components/product/ProductDetailClient'

export const revalidate = 3600

export async function generateStaticParams() {
  // This runs while Vercel BUILDS the site. If the database is
  // unreachable at that moment (e.g. Supabase paused it), we must
  // not crash the whole deploy — return an empty list instead.
  // Product pages are then simply built on first visit, once the
  // database is back.
  try {
    const products = await prisma.product.findMany({
      select: { slug: true }
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

  if (!product) {
    return { title: 'Product not found | Biahama' }
  }

  return {
    title: `${product.name} | Biahama`,
    description: product.description || 'Luxury Linen crafted in India.',
  }
}

export default async function ProductDetailPage({ params }) {
  const { slug } = await params
  const product = await getProduct(slug)

  // No such product in the database -> show the normal 404 page
  if (!product || !product.isActive) {
    notFound()
  }

  return <ProductDetailClient product={product} />
}
