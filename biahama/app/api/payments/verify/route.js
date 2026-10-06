import { after, NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { z } from 'zod'
import { createClient } from '@/utils/supabase/server'
import { getRazorpay } from '@/lib/razorpay'
import { checkouts } from '@/lib/checkouts'
import { processOrderTasks } from '@/lib/order-tasks'
import { withErrorLogging } from '@/lib/logger'

const schema = z.object({
  checkoutId: z.string().uuid(), razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1), razorpay_signature: z.string().regex(/^[a-f0-9]{64}$/),
})
export const maxDuration = 60

export const POST = withErrorLogging('payments/verify', async req => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Please log in to continue' }, { status: 401 })
  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Missing or invalid payment details' }, { status: 400 })
  const body = parsed.data
  const gateway = getRazorpay()
  const signature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${body.razorpay_order_id}|${body.razorpay_payment_id}`).digest('hex')
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(body.razorpay_signature))) {
    return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 })
  }
  const payment = await gateway.payments.fetch(body.razorpay_payment_id)
  if (payment.order_id !== body.razorpay_order_id) return NextResponse.json({ error: 'Payment order does not match' }, { status: 400 })
  const order = await checkouts.complete(payment, body.checkoutId, user.id)
  after(() => processOrderTasks(order.id, Date.now() + 30000))
  return NextResponse.json({ orderId: order.id })
})
