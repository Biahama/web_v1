import { after, NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { checkouts } from '@/lib/checkouts'
import { processOrderTasks } from '@/lib/order-tasks'
import { logError } from '@/lib/logger'

export const maxDuration = 60

export async function POST(req) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET
  if (!secret) return NextResponse.json({ error: 'Payment notifications are unavailable' }, { status: 503 })
  const body = await req.text()
  const signature = req.headers.get('x-razorpay-signature') || ''
  const expected = crypto.createHmac('sha256', secret).update(body).digest('hex')
  if (!/^[a-f0-9]{64}$/.test(signature) || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }
  let event
  try { event = JSON.parse(body) } catch { return NextResponse.json({ error: 'Invalid event' }, { status: 400 }) }
  if (event.event !== 'payment.captured') return NextResponse.json({ ok: true })
  const payment = event.payload?.payment?.entity
  if (!payment?.id || !payment.order_id) return NextResponse.json({ error: 'Invalid payment event' }, { status: 400 })
  try {
    const order = await checkouts.complete(payment)
    after(() => processOrderTasks(order.id, Date.now() + 30000))
    return NextResponse.json({ ok: true })
  } catch (error) {
    await logError('razorpay webhook recovery', error, { paymentId: payment.id, paymentOrderId: payment.order_id })
    // Provider retries instead of discarding a captured payment on failure.
    return NextResponse.json({ error: 'Payment confirmation will be retried' }, { status: 503 })
  }
}
