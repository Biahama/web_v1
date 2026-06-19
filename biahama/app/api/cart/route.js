import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

import { prisma } from '@/lib/prisma'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
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
}

export async function POST(req) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { variantId, quantity } = await req.json()
  if (!variantId || !quantity) return NextResponse.json({ error: 'Invalid' }, { status: 400 })

  const existing = await prisma.cart.findFirst({
    where: { userId: user.id, variantId },
  })

  const item = existing
    ? await prisma.cart.update({ where: { id: existing.id }, data: { quantity } })
    : await prisma.cart.create({ data: { userId: user.id, variantId, quantity } })

  return NextResponse.json(item)
}

export async function DELETE(req) {
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
}
