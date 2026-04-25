import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const order = await prisma.order.findFirst({
    where: { id, userId: session.user.id },
    include: { items: true },
  })

  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(order)
}
