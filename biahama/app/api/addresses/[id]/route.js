import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  await prisma.address.deleteMany({ where: { id, userId: session.user.id } })
  return NextResponse.json({ ok: true })
}

export async function PATCH(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  if (body.isDefault) {
    await prisma.address.updateMany({ where: { userId: session.user.id }, data: { isDefault: false } })
  }

  const address = await prisma.address.update({
    where: { id },
    data: body,
  })

  return NextResponse.json(address)
}
