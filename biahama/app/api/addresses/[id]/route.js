import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/prisma'
import { withErrorLogging } from '@/lib/logger'
import { addressUpdateSchema, saveAddress, deleteAddress } from '@/lib/address-service'

export const PATCH = withErrorLogging('api/addresses/[id] PATCH', async (req, { params }) => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 })
  const { id } = await params
  const parsed = addressUpdateSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  return NextResponse.json(await saveAddress(prisma, user.id, parsed.data, id))
})

export const DELETE = withErrorLogging('api/addresses/[id] DELETE', async (req, { params }) => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 })
  const { id } = await params
  await deleteAddress(prisma, user.id, id)
  return NextResponse.json({ ok: true })
})
