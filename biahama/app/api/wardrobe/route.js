// ============================================================
// MY WARDROBE API — save / unsave products (the hanger button).
// ============================================================

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/prisma'
import { ensureUser } from '@/lib/ensure-user'
import { withErrorLogging } from '@/lib/logger'

// GET — the logged-in user's saved products (guests get an empty list).
export const GET = withErrorLogging('api/wardrobe GET', async () => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json([])

  const items = await prisma.wardrobeItem.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    include: {
      product: {
        include: {
          images: { where: { isPrimary: true }, take: 1 },
          variants: {
            select: { id: true, price: true, comparePrice: true, stockQty: true, color: true, colorHex: true, size: true },
          },
        },
      },
    },
  })

  return NextResponse.json(items)
})

const addSchema = z.object({ productId: z.string().min(1) })

// POST — save a product.
export const POST = withErrorLogging('api/wardrobe POST', async (req) => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Please log in to save items' }, { status: 401 })

  const parsed = addSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  const product = await prisma.product.findUnique({ where: { id: parsed.data.productId } })
  if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

  await ensureUser(user)

  // upsert = saving twice is harmless, never a crash
  await prisma.wardrobeItem.upsert({
    where: { userId_productId: { userId: user.id, productId: product.id } },
    update: {},
    create: { userId: user.id, productId: product.id },
  })

  return NextResponse.json({ saved: true })
})

// DELETE ?productId=... — remove a saved product.
export const DELETE = withErrorLogging('api/wardrobe DELETE', async (req) => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const productId = new URL(req.url).searchParams.get('productId')
  if (!productId) return NextResponse.json({ error: 'productId required' }, { status: 400 })

  await prisma.wardrobeItem.deleteMany({ where: { userId: user.id, productId } })
  return NextResponse.json({ saved: false })
})
