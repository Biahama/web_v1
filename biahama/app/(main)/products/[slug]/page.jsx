import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import ProductDetailClient from '@/components/product/ProductDetailClient'

export async function generateMetadata({ params }) {
  const { slug } = await params
  const product = await prisma.product.findUnique({
    where: { slug }
  })

  if (!product) return {}

  return {
    title: `${product.name} | Biahama`,
    description: product.description || 'Luxury Linen crafted in India.',
  }
}

export default async function ProductDetailPage({ params }) {
  const { slug } = await params

  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      images:   { orderBy: { sortOrder: 'asc' } },
      variants: { orderBy: { size: 'asc' } },
    },
  })

  if (!product || !product.isActive) {
    notFound()
  }

  return <ProductDetailClient product={product} />
}
