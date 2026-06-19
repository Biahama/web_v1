import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

import { prisma } from '@/lib/prisma'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    include: {
      items: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(orders)
}
