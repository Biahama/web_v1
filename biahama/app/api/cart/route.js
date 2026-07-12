import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { z } from 'zod'

import { prisma } from '@/lib/prisma'
import { withErrorLogging } from '@/lib/logger'
import { ensureUser } from '@/lib/ensure-user'

// Rules for adding to cart: a real product variant ID, and a
// quantity between 1 and 10. This blocks negative quantities
// (which would make order totals negative) and silly huge numbers.
const addToCartSchema = z.object({
  variantId: z.string().min(1),
  quantity:  z.number().int().min(1).max(10),
})

export const GET = withErrorLogging('api/cart GET', async () => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  // Guests simply have an empty cart — not an error.
  if (!user) return NextResponse.json([], { status: 200 })

  const items = await prisma.cart.findMany({
    where: { userId: user.id },
    include: {
      variant: {
        include: {
          product: { select: { name: true, slug: true, description: true, fabric: true, care: true } },
          images:  { where: { isPrimary: true }, take: 1 },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json(items)
})

export const POST = withErrorLogging('api/cart POST', async (req) => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // SECURITY: validate the input so bad quantities (negative, zero,
  // huge, or non-whole numbers) are rejected before touching the database.
  const body = await req.json()
  const parsed = addToCartSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }
  const { variantId, quantity } = parsed.data

  // Make sure the product variant really exists before adding it.
  const variant = await prisma.productVariant.findUnique({ where: { id: variantId } })
  if (!variant) {
    return NextResponse.json(
      { error: 'This product variant does not exist. It may have been removed from the store.' },
      { status: 404 }
    )
  }

  // Don't let anyone order more than we have in stock.
  if (quantity > variant.stockQty) {
    return NextResponse.json(
      { error: `Only ${variant.stockQty} left in stock` },
      { status: 400 }
    )
  }

  // Make sure this Supabase user has a row in our own User table,
  // otherwise the cart insert would fail with a database error.
  await ensureUser(user)

  const existing = await prisma.cart.findFirst({
    where: { userId: user.id, variantId },
  })

  const item = existing
    ? await prisma.cart.update({ where: { id: existing.id }, data: { quantity } })
    : await prisma.cart.create({ data: { userId: user.id, variantId, quantity } })

  return NextResponse.json(item)
})

export const DELETE = withErrorLogging('api/cart DELETE', async (req) => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const variantId = searchParams.get('variantId')

  if (variantId) {
    await prisma.cart.deleteMany({ where: { userId: user.id, variantId } })
  } else {
    await prisma.cart.deleteMany({ where: { userId: user.id } })
  }

  return NextResponse.json({ ok: true })
})
