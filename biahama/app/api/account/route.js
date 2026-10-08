import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/prisma'
import { ensureUser } from '@/lib/ensure-user'
import { withErrorLogging } from '@/lib/logger'

const schema = z.object({
  name: z.string().trim().min(2, 'Enter your full name').max(100),
  phone: z.union([z.literal(''), z.string().trim().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number')]),
})
export const PATCH = withErrorLogging('api/account PATCH', async req => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 })
  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  await ensureUser(user)
  const profile = await prisma.user.update({ where: { id: user.id }, data: { name: parsed.data.name, phone: parsed.data.phone || null }, select: { name: true, phone: true } })
  return NextResponse.json(profile)
})
