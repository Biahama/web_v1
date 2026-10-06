// ============================================================
// ADMIN API: view / update ONE order
// ============================================================
//   GET   /api/admin/orders/<id>  -> the order with items + customer
//   PATCH /api/admin/orders/<id>  -> change status / tracking / notes
//
// The PATCH does the right follow-up work automatically:
//   * marked "shipped"    -> the customer gets a shipped email
//   * marked "delivered"  -> a COD order is marked PAID (the money
//                            was handed over at the door) and the
//                            customer's loyalty points are credited
//   * marked "cancelled"  -> the items go back into stock
// ============================================================

import { after, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'
import { withErrorLogging } from '@/lib/logger'
import { updateOrderStatus } from '@/lib/order-status-service'
import { processOrderTasks } from '@/lib/order-tasks'

// What the admin panel may change on an order. Everything is
// optional — send only what changed.
const patchSchema = z.object({
  status: z.enum(['confirmed', 'processing', 'shipped', 'delivered', 'cancelled']).optional(),
  awbNumber: z.string().optional(),
  shippingPartner: z.string().optional(),
  notes: z.string().max(2000, 'Notes can be at most 2000 characters').optional(),
})

// ------------------------------------------------------------
// GET — one order, with its items and the customer's details.
// ------------------------------------------------------------
export const GET = withErrorLogging('api/admin/orders/[id] GET', async (req, { params }) => {
  try {
    await requireAdmin()
    const { id } = await params // Next.js gives params as a promise

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
        user: { select: { email: true, name: true } },
      },
    })
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }
    return NextResponse.json({ order })
  } catch (err) {
    if (err.statusCode) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    throw err
  }
})

// ------------------------------------------------------------
// PATCH — update the order (status, tracking number, notes).
// ------------------------------------------------------------
export const PATCH = withErrorLogging('api/admin/orders/[id] PATCH', async (req, { params }) => {
  try {
    await requireAdmin()
    const { id } = await params

    const parsed = patchSchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }
    const data = parsed.data

    await updateOrderStatus(prisma, id, data)
    after(() => processOrderTasks(id))

    // Send back the freshly saved order so the page can refresh.
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
        user: { select: { email: true, name: true } },
      },
    })
    return NextResponse.json({ order, message: 'Saved.' })
  } catch (err) {
    if (err.statusCode) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    throw err
  }
})
