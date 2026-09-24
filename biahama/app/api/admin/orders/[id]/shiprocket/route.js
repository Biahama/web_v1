// ============================================================
// ADMIN API: Shiprocket actions for ONE order
// ============================================================
//   POST /api/admin/orders/<id>/shiprocket   body: { action }
//
//   action: 'create' -> send the order to Shiprocket
//           'awb'    -> book a courier + get a tracking number
//           'track'  -> ask Shiprocket where the parcel is
//
// If Shiprocket refuses, the response is a 502 that contains
// Shiprocket's OWN message, so you can see exactly why (wrong
// login, unserviceable pincode, empty wallet, missing pickup
// address...). Every such failure is also saved to the ErrorLog.
// ============================================================

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'
import { withErrorLogging, logError } from '@/lib/logger'
import { sendOrderShippedEmail } from '@/lib/email'
import { creditPointsForOrder } from '@/lib/loyalty'
import { createShiprocketOrder, assignAwb, trackByShipmentId } from '@/lib/shiprocket'

const bodySchema = z.object({
  action: z.enum(['create', 'awb', 'track']),
})

export const POST = withErrorLogging('api/admin/orders/[id]/shiprocket POST', async (req, { params }) => {
  const { id } = await params // available to the catch below too
  try {
    await requireAdmin()

    const parsed = bodySchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Body must be { action: 'create' | 'awb' | 'track' }" },
        { status: 400 }
      )
    }
    const { action } = parsed.data

    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    })
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // --------------------------------------------------------
    // 'create' — send the order to Shiprocket (once).
    // --------------------------------------------------------
    if (action === 'create') {
      if (order.srOrderId) {
        // Already there — never create a duplicate in Shiprocket.
        return NextResponse.json({
          message: 'Already sent to Shiprocket',
          srOrderId: order.srOrderId,
          srShipmentId: order.srShipmentId,
        })
      }

      const sr = await createShiprocketOrder(order)

      // Remember Shiprocket's ids and move the order to
      // "processing" — it is now being prepared for dispatch.
      await prisma.order.update({
        where: { id },
        data: {
          srOrderId: String(sr.order_id),
          srShipmentId: String(sr.shipment_id),
          status: 'processing',
        },
      })

      return NextResponse.json({
        message: 'Order sent to Shiprocket.',
        srOrderId: String(sr.order_id),
        srShipmentId: String(sr.shipment_id),
      })
    }

    // The other two actions need the Shiprocket shipment id.
    if (!order.srShipmentId) {
      return NextResponse.json(
        { error: 'This order has not been sent to Shiprocket yet. Click "Send to Shiprocket" first.' },
        { status: 400 }
      )
    }

    // --------------------------------------------------------
    // 'awb' — book a courier and get the tracking number.
    // --------------------------------------------------------
    if (action === 'awb') {
      const { awbCode, courierName } = await assignAwb(order.srShipmentId)

      // A courier is booked -> the order is on its way.
      await prisma.order.update({
        where: { id },
        data: {
          awbNumber: awbCode,
          shippingPartner: courierName,
          status: 'shipped',
          shippingStatus: 'in_transit',
        },
      })

      // Tell the customer (includes the tracking number).
      // Never throws — email failures are logged, not fatal.
      await sendOrderShippedEmail(id)

      return NextResponse.json({
        message: `Courier booked: ${courierName || 'assigned'} — tracking number ${awbCode}. The customer has been emailed.`,
        awbNumber: awbCode,
        shippingPartner: courierName,
      })
    }

    // --------------------------------------------------------
    // 'track' — where is the parcel right now?
    // --------------------------------------------------------
    if (action === 'track') {
      const { currentStatus, raw } = await trackByShipmentId(order.srShipmentId)

      // If Shiprocket says it's delivered, update our order too.
      let orderUpdated = false
      if (currentStatus.toLowerCase().includes('delivered') && order.status !== 'delivered') {
        const changes = { status: 'delivered', shippingStatus: 'delivered' }
        // Cash on Delivery: the money was collected at the door,
        // so the order is now PAID.
        if (order.paymentMethod === 'cod') changes.paymentStatus = 'paid'
        await prisma.order.update({ where: { id }, data: changes })

        // COD points are credited only once the money is in hand.
        // (Online payments got their points when the payment cleared.)
        // Safe to call twice — the ledger refuses duplicates.
        if (order.paymentMethod === 'cod') {
          await creditPointsForOrder(id)
        }
        orderUpdated = true
      }

      return NextResponse.json({
        message: currentStatus
          ? `Latest status from Shiprocket: ${currentStatus}`
          : 'Shiprocket has no tracking updates yet (this is normal right after booking).',
        currentStatus,
        orderUpdated,
        tracking: raw,
      })
    }

    // Can't happen (zod only allows the three actions) — but be explicit.
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err) {
    // 502 = Shiprocket itself said no. Record it (with Shiprocket's
    // message) so there's a permanent trace in the ErrorLog, then
    // show the owner the real reason.
    if (err.statusCode === 502) {
      await logError('api/admin/orders/[id]/shiprocket POST — Shiprocket refused', err, { orderId: id })
      return NextResponse.json({ error: err.message }, { status: 502 })
    }
    if (err.statusCode) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    throw err
  }
})
