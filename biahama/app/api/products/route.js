import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category')
  const limit    = parseInt(searchParams.get('limit') || '50')
  const slug     = searchParams.get('slug')

  const where = {
    isActive: true,
    ...(category ? { category: { equals: category, mode: 'insensitive' } } : {}),
    ...(slug     ? { slug }                                                 : {}),
  }

  const products = await prisma.product.findMany({
    where,
    take: limit,
    orderBy: { createdAt: 'desc' },
    include: {
      images:   { where: { isPrimary: true }, take: 1 },
      variants: { select: { price: true, comparePrice: true, stockQty: true, color: true, colorHex: true, size: true } },
    },
  })

  const mapped = products.map(p => {
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
      altText:        p.images[0]?.altText ?? p.name,
      price:          minPrice,
      inStock,
      firstVariantId: firstInStockVariant?.id ?? null,
      variants:       p.variants,
      colors:         [...new Map(p.variants.map(v => [v.color, { color: v.color, colorHex: v.colorHex }])).values()],
    }
  })

  return NextResponse.json(mapped)
}
