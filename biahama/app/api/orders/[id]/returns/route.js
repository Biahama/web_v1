import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/prisma'
import { withErrorLogging } from '@/lib/logger'
import { returnSchema, requestReturn } from '@/lib/return-service'

export const POST = withErrorLogging('api/orders/[id]/returns POST', async (req, { params }) => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 })
  const { id } = await params
  const parsed = returnSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  const result = await requestReturn(prisma, user.id, id, parsed.data)
  return NextResponse.json(result, { status: 201 })
})
