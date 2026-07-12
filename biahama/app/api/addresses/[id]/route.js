import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { z } from 'zod'

import { prisma } from '@/lib/prisma'
import { withErrorLogging } from '@/lib/logger'

// Rules for what an address update is allowed to contain.
// Every field is optional (you can update just one thing),
// but anything you DO send must be valid. Any extra fields
// a hacker adds (like userId) are simply thrown away.
const updateSchema = z.object({
  fullName:  z.string().min(2).optional(),
  phone:     z.string().length(10).optional(),
  line1:     z.string().min(3).optional(),
  line2:     z.string().optional(),
  pincode:   z.string().length(6).optional(),
  city:      z.string().min(2).optional(),
  state:     z.string().min(2).optional(),
  isDefault: z.boolean().optional(),
})

export const DELETE = withErrorLogging('api/addresses/[id] DELETE', async (req, { params }) => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  // deleteMany with userId means you can only delete YOUR OWN address.
  await prisma.address.deleteMany({ where: { id, userId: user.id } })
  return NextResponse.json({ ok: true })
})

export const PATCH = withErrorLogging('api/addresses/[id] PATCH', async (req, { params }) => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  // SECURITY: first check the address actually belongs to the logged-in
  // user. Without this, any customer could edit any other customer's
  // address just by guessing its ID.
  const existing = await prisma.address.findFirst({
    where: { id, userId: user.id },
  })
  if (!existing) {
    return NextResponse.json({ error: 'Address not found' }, { status: 404 })
  }

  // SECURITY: validate the incoming data and only keep the allowed
  // fields. This stops anyone from sneaking in fields we never
  // intended to be editable (like changing the address's owner).
  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  // If this address is being made the default, un-default the others first.
  if (parsed.data.isDefault) {
    await prisma.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } })
  }

  const address = await prisma.address.update({
    where: { id },
    data: parsed.data, // only the validated fields, nothing else
  })

  return NextResponse.json(address)
})
