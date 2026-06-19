import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

import { prisma } from '@/lib/prisma'

export async function DELETE(req, { params }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  await prisma.address.deleteMany({ where: { id, userId: user.id } })
  return NextResponse.json({ ok: true })
}

export async function PATCH(req, { params }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  if (body.isDefault) {
    await prisma.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } })
  }

  const address = await prisma.address.update({
    where: { id },
    data: body,
  })

  return NextResponse.json(address)
}
