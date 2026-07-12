import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

import { prisma } from '@/lib/prisma'
import { withErrorLogging } from '@/lib/logger'

// Returns one order — only if it belongs to the logged-in customer
// (the userId in the query makes sure of that).
// Wrapped so any unexpected crash is logged to the ErrorLog table.
export const GET = withErrorLogging('api/orders/[id] GET', async (req, { params }) => {
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
})
