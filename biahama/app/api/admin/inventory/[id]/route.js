import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'
import { withErrorLogging } from '@/lib/logger'
import { revalidateCatalog } from '@/lib/revalidate-catalog'

const schema = z.object({ stockQty: z.number().int().min(0).max(100000), expectedStock: z.number().int().min(0) })
export const PATCH = withErrorLogging('api/admin/inventory/[id] PATCH', async (req, { params }) => {
  await requireAdmin()
  const { id } = await params
  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  const result = await prisma.productVariant.updateMany({ where: { id, stockQty: parsed.data.expectedStock }, data: { stockQty: parsed.data.stockQty } })
  if (!result.count) return NextResponse.json({ error: 'Stock changed since this page loaded. Refresh before saving to avoid overwriting a sale or reservation.' }, { status: 409 })
  const variant = await prisma.productVariant.findUnique({ where: { id }, select: { stockQty: true, product: { select: { slug: true } } } })
  revalidateCatalog(variant.product.slug)
  return NextResponse.json({ stockQty: variant.stockQty })
})
