import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'

export async function POST(req) {
  const body = await req.text()
  const signature = req.headers.get('x-razorpay-signature')

  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex')

  if (expectedSignature !== signature) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const event = JSON.parse(body)

  if (event.event === 'payment.captured') {
    const paymentId = event.payload.payment.entity.id
    const orderId   = event.payload.payment.entity.order_id

    await prisma.order.updateMany({
      where: { paymentId },
      data:  { paymentStatus: 'paid', status: 'confirmed' },
    })
  }

  if (event.event === 'payment.failed') {
    const paymentId = event.payload.payment.entity.id

    await prisma.order.updateMany({
      where: { paymentId },
      data:  { paymentStatus: 'failed', status: 'cancelled' },
    })
  }

  return NextResponse.json({ ok: true })
}
