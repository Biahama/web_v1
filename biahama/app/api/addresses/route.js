import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const schema = z.object({
  fullName: z.string().min(2),
  phone:    z.string().length(10),
  line1:    z.string().min(3),
  line2:    z.string().optional(),
  pincode:  z.string().length(6),
  city:     z.string().min(2),
  state:    z.string().min(2),
  isDefault: z.boolean().optional(),
})

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const addresses = await prisma.address.findMany({
    where: { userId: session.user.id },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  })

  return NextResponse.json(addresses)
}

export async function POST(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  const { isDefault, ...data } = parsed.data

  if (isDefault) {
    await prisma.address.updateMany({ where: { userId: session.user.id }, data: { isDefault: false } })
  }

  const address = await prisma.address.create({
    data: { ...data, userId: session.user.id, isDefault: isDefault ?? false },
  })

  return NextResponse.json(address, { status: 201 })
}
