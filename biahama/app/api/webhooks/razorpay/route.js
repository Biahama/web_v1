// ============================================================
// RAZORPAY WEBHOOK — Razorpay's server calls this directly
// ============================================================
// This is our safety net. Even if the customer's browser dies
// right after paying, Razorpay still tells US the payment
// happened, and we create the order here so no money is ever
// received without an order.
//
// Setup required: RAZORPAY_WEBHOOK_SECRET must be set in the
// environment, matching the secret entered in the Razorpay
// dashboard when the webhook was created.
// ============================================================

import { NextResponse } from 'next/server'
import crypto from 'crypto'

import { prisma } from '@/lib/prisma'
import { createOrderFromCart } from '@/lib/orders'
import { withErrorLogging, logError } from '@/lib/logger'

// Compare two strings in "constant time" — a plain === comparison
// leaks timing information an attacker could use to forge signatures.
function safeEqual(a, b) {
  const bufA = Buffer.from(String(a))
  const bufB = Buffer.from(String(b))
  if (bufA.length !== bufB.length) return false
  return crypto.timingSafeEqual(bufA, bufB)
}

export const POST = withErrorLogging('api/webhooks/razorpay', async (req) => {
  const body = await req.text()
  const signature = req.headers.get('x-razorpay-signature') || ''

  // The webhook secret is DIFFERENT from the API key secret.
  // If we "helpfully" fell back to the key secret, every real
  // webhook would be silently rejected — so we fail loudly instead.
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET
  if (!webhookSecret) {
    await logError('api/webhooks/razorpay', 'RAZORPAY_WEBHOOK_SECRET is not configured', {})
    return NextResponse.json({ error: 'RAZORPAY_WEBHOOK_SECRET is not configured' }, { status: 500 })
  }

  // Prove this call really came from Razorpay, not an impostor.
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(body)
    .digest('hex')

  if (!safeEqual(expectedSignature, signature)) {
    await logError('api/webhooks/razorpay', 'Rejected webhook: signature did not match', {
      receivedSignature: signature,
    })
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const event = JSON.parse(body)

  if (event.event === 'payment.captured') {
    const payment   = event.payload.payment.entity
    const paymentId = payment.id

    const existingOrder = await prisma.order.findUnique({ where: { paymentId } })

    if (existingOrder) {
      // Normal case: the order already exists — just mark it paid.
      await prisma.order.update({
        where: { paymentId },
        data:  { paymentStatus: 'paid', status: 'confirmed' },
      })
    } else {
      // Backup case: the customer PAID but no order exists — their
      // browser probably closed before our verify step could run.
      // We stored userId and addressId in the payment "notes" when
      // creating the Razorpay order, exactly for this situation.
      // couponCode was also stored in the notes, so the backup
      // order applies the same discount the customer paid for.
      const { userId, addressId, couponCode } = payment.notes || {}

      if (!userId || !addressId) {
        await logError(
          'api/webhooks/razorpay',
          'MONEY RECEIVED BUT NO ORDER: payment has no userId/addressId in notes — create the order manually',
          { event }
        )
      } else {
        try {
          await createOrderFromCart(userId, addressId, {
            paymentMethod: 'razorpay',
            paymentId,
            paymentStatus: 'paid',
            codAmount:     null,
          }, couponCode || null)
        } catch (err) {
          // The cart may already be empty, or stock ran out.
          // Log EVERYTHING so the owner can see "money received,
          // no order" in the ErrorLog table and act on it.
          await logError(
            'api/webhooks/razorpay',
            new Error(`MONEY RECEIVED BUT NO ORDER CREATED: ${err.message}`),
            { userId, addressId, paymentId, event }
          )
        }
      }
    }
  }

  if (event.event === 'payment.failed') {
    const paymentId = event.payload.payment.entity.id

    await prisma.order.updateMany({
      where: { paymentId },
      data:  { paymentStatus: 'failed', status: 'cancelled' },
    })
  }

  // Always answer 200 so Razorpay does not endlessly retry —
  // any problem above has already been logged for the owner.
  return NextResponse.json({ ok: true })
})
