import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

import { prisma } from '@/lib/prisma'
import { withErrorLogging } from '@/lib/logger'

// Returns the logged-in customer's own orders (newest first).
// Wrapped so any unexpected crash is logged to the ErrorLog table.
export const GET = withErrorLogging('api/orders GET', async () => {
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
})
