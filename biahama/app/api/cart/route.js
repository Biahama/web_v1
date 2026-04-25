import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json([], { status: 200 })

  const items = await prisma.cart.findMany({
    where: { userId: session.user.id },
    include: {
      variant: {
        include: {
          product: { select: { name: true, slug: true } },
          images:  { where: { isPrimary: true }, take: 1 },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json(items)
}

export async function POST(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { variantId, quantity } = await req.json()
  if (!variantId || !quantity) return NextResponse.json({ error: 'Invalid' }, { status: 400 })

  const existing = await prisma.cart.findFirst({
    where: { userId: session.user.id, variantId },
  })

  const item = existing
    ? await prisma.cart.update({ where: { id: existing.id }, data: { quantity } })
    : await prisma.cart.create({ data: { userId: session.user.id, variantId, quantity } })

  return NextResponse.json(item)
}

export async function DELETE(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const variantId = searchParams.get('variantId')

  if (variantId) {
    await prisma.cart.deleteMany({ where: { userId: session.user.id, variantId } })
  } else {
    await prisma.cart.deleteMany({ where: { userId: session.user.id } })
  }

  return NextResponse.json({ ok: true })
}
