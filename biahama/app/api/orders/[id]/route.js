import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

import { prisma } from '@/lib/prisma'

export async function GET(req, { params }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const order = await prisma.order.findFirst({
    where: { id, userId: user.id },
    include: { items: true },
  })

  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(order)
}
