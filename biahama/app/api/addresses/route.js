import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { z } from 'zod'

import { prisma } from '@/lib/prisma'
import { withErrorLogging } from '@/lib/logger'
import { ensureUser } from '@/lib/ensure-user'

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

export const GET = withErrorLogging('api/addresses GET', async () => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const addresses = await prisma.address.findMany({
    where: { userId: user.id },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  })

  return NextResponse.json(addresses)
})

export const POST = withErrorLogging('api/addresses POST', async (req) => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  // Make sure this Supabase user has a row in our own User table,
  // otherwise saving the address would fail with a database error.
  await ensureUser(user)

  const { isDefault, ...data } = parsed.data

  if (isDefault) {
    await prisma.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } })
  }

  const address = await prisma.address.create({
    data: { ...data, userId: user.id, isDefault: isDefault ?? false },
  })

  return NextResponse.json(address, { status: 201 })
})
