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

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'
import { withErrorLogging } from '@/lib/logger'
import { sendOrderShippedEmail } from '@/lib/email'
import { creditPointsForOrder } from '@/lib/loyalty'

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

    // Load the order as it is right now — we need the OLD status
    // to know which follow-up actions to run, and the items in
    // case we have to put stock back.
    const existing = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Only touch the fields the admin actually sent.
    const changes = {}
    if (data.status !== undefined) changes.status = data.status
    if (data.awbNumber !== undefined) changes.awbNumber = data.awbNumber.trim() || null
    if (data.shippingPartner !== undefined) changes.shippingPartner = data.shippingPartner.trim() || null
    if (data.notes !== undefined) changes.notes = data.notes.trim() || null

    // Which follow-ups apply? (only when the status actually CHANGES
    // to that value — saving "shipped" twice must not email twice)
    const becomesShipped = data.status === 'shipped' && existing.status !== 'shipped'
    const becomesDelivered = data.status === 'delivered' && existing.status !== 'delivered'
    const becomesCancelled = data.status === 'cancelled' && existing.status !== 'cancelled'

    // SIDE EFFECT: shipped -> keep the shipping status in step so
    // the customer's account page shows the parcel as moving.
    if (becomesShipped) changes.shippingStatus = 'in_transit'

    // SIDE EFFECT: delivered -> for Cash on Delivery, the money was
    // received at the door, so the order is now PAID.
    if (becomesDelivered) {
      changes.shippingStatus = 'delivered'
      if (existing.paymentMethod === 'cod') changes.paymentStatus = 'paid'
    }

    if (becomesCancelled) {
      // SIDE EFFECT: cancelled -> put every item back into stock.
      // The status change and the stock changes happen in ONE
      // transaction: either all of it saves or none of it does —
      // otherwise a crash halfway could cancel the order but
      // "lose" the stock (or vice versa).
      await prisma.$transaction(async (tx) => {
        await tx.order.update({ where: { id }, data: changes })
        for (const item of existing.items) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stockQty: { increment: item.quantity } },
          })
        }
      })
    } else {
      await prisma.order.update({ where: { id }, data: changes })
    }

    // SIDE EFFECT: shipped -> tell the customer. This never throws
    // (email failures are logged, they don't block the save).
    if (becomesShipped) {
      await sendOrderShippedEmail(id)
    }

    // SIDE EFFECT: COD delivered -> credit loyalty points, now that
    // the order is actually paid. Safe to call twice (the ledger
    // refuses duplicates) and never throws.
    if (becomesDelivered && existing.paymentMethod === 'cod') {
      await creditPointsForOrder(id)
    }

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
