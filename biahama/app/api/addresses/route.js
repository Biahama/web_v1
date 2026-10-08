import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { addressSchema, saveAddress } from '@/lib/address-service'

import { prisma } from '@/lib/prisma'
import { withErrorLogging } from '@/lib/logger'
import { ensureUser } from '@/lib/ensure-user'

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

  const parsed = addressSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  // Make sure this Supabase user has a row in our own User table,
  // otherwise saving the address would fail with a database error.
  await ensureUser(user)

  const address = await saveAddress(prisma, user.id, parsed.data)

  return NextResponse.json(address, { status: 201 })
})
