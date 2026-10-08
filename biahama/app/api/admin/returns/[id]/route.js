import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { withErrorLogging } from '@/lib/logger'
import { returnUpdateSchema, updateReturn } from '@/lib/return-service'

export const PATCH = withErrorLogging('api/admin/returns/[id] PATCH', async (req, { params }) => {
  await requireAdmin()
  const { id } = await params
  const parsed = returnUpdateSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  return NextResponse.json(await updateReturn(prisma, id, parsed.data))
})
