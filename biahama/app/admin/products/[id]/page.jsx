// ============================================================
// /admin/products/<id> — edit one product
// ============================================================
// Loads the product from the database and hands it to the same
// form used for creating products. Unknown id -> normal 404.
// ============================================================

import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import ProductForm from '../ProductForm'

// Always render fresh — no caching for admin pages.
export const dynamic = 'force-dynamic'

export default async function EditProductPage({ params }) {
  const { id } = await params // Next.js gives params as a promise

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      variants: { orderBy: { createdAt: 'asc' } },
      images:   { orderBy: { sortOrder: 'asc' } },
    },
  })

  if (!product) notFound()

  // The form is a client component, so it can only receive plain
  // JSON data — this converts Date objects into plain text.
  const plainProduct = JSON.parse(JSON.stringify(product))

  return <ProductForm initial={plainProduct} />
}
