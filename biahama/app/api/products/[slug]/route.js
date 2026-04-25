import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req, { params }) {
  const { slug } = await params

  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      images:   { orderBy: { sortOrder: 'asc' } },
      variants: { orderBy: { size: 'asc' } },
      reviews:  { where: { isPublished: true }, include: { user: { select: { name: true } } } },
    },
  })

  if (!product || !product.isActive) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(product)
}
