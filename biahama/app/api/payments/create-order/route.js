import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { z } from 'zod'
import { checkouts } from '@/lib/checkouts'
import { ensureUser } from '@/lib/ensure-user'
import { withErrorLogging } from '@/lib/logger'
import { getRazorpay } from '@/lib/razorpay'
import { missingEnvironment, PAYMENT_ENV } from '@/lib/readiness'

const schema = z.object({ addressId: z.string().min(1), couponCode: z.string().max(100).optional(), checkoutKey: z.string().uuid() })
export const maxDuration = 60
export const POST = withErrorLogging('payments/create-order', async req => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Please log in to continue' }, { status: 401 })
  const body = schema.safeParse(await req.json().catch(() => null))
  if (!body.success) return NextResponse.json({ error: body.error.issues[0].message }, { status: 400 })
  if (missingEnvironment(process.env, PAYMENT_ENV).length) return NextResponse.json({ error: 'Online payments are temporarily unavailable. Please contact hello@biahama.com.' }, { status: 503 })
  getRazorpay() // fail before reserving anything if credentials are missing
  await ensureUser(user)
  const checkout = await checkouts.begin(user.id, body.data.addressId, body.data.couponCode, body.data.checkoutKey)
  return NextResponse.json({
    checkoutId: checkout.id, orderId: checkout.razorpayOrderId, completedOrderId: checkout.orderId,
    items: checkout.items.map(item => ({ variantId: item.variantId, quantity: item.quantity, variant: { price: item.priceAtPurchase, size: item.variantDetails.size, color: item.variantDetails.color, sku: item.variantDetails.sku, images: item.imageUrl ? [{ url: item.imageUrl }] : [], product: { name: item.productName } } })),
    shippingAddress: checkout.shippingAddress,
    amount: checkout.totalAmount, currency: 'INR', discount: checkout.discountAmount,
    shipping: checkout.shippingAmount, couponCode: checkout.couponCode,
    expiresAt: checkout.expiresAt, keyId: process.env.RAZORPAY_KEY_ID,
    prefill: { name: checkout.shippingAddress.fullName, email: user.email, contact: checkout.shippingAddress.phone },
  })
})
