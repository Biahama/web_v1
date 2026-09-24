// ============================================================
// ADMIN API: list all orders
// ============================================================
//   GET /api/admin/orders            -> every order, newest first
//   GET /api/admin/orders?status=shipped -> only shipped orders
// Admin-only (requireAdmin), like every /api/admin/* route.
// ============================================================

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'
import { withErrorLogging } from '@/lib/logger'

export const GET = withErrorLogging('api/admin/orders GET', async (req) => {
  try {
    await requireAdmin()

    // Optional ?status= filter (e.g. only "shipped" orders).
    const status = new URL(req.url).searchParams.get('status')

    const orders = await prisma.order.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        items: true,
        user: { select: { email: true, name: true } },
      },
    })

    return NextResponse.json({ orders })
  } catch (err) {
    if (err.statusCode) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    throw err
  }
})
