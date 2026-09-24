// ============================================================
// STEP 2 OF CHECKOUT: verify the payment, then create the order
// ============================================================
// For online payments we check THREE things before creating
// the order:
//   1. The signature really came from Razorpay (not a forgery).
//   2. The amount paid matches the cart total on OUR server
//      (stops "pay for a cheap cart, then swap in expensive items").
//   3. The payment was started by THIS logged-in user.
// For Cash on Delivery there is no payment yet, so we just
// create the order with payment status "pending".
// ============================================================

import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import crypto from 'crypto'
import { z } from 'zod'

import { prisma } from '@/lib/prisma'
import { getRazorpay } from '@/lib/razorpay'
import { computeTotals, SHIPPING_THRESHOLD, SHIPPING_COST } from '@/lib/pricing'
import { validateCouponOrThrow } from '@/lib/coupons'
import { createOrderFromCart } from '@/lib/orders'
import { ensureUser } from '@/lib/ensure-user'
import { withErrorLogging, logError } from '@/lib/logger'

// An error whose message is safe to show the customer.
function userError(message, statusCode) {
  const err = new Error(message)
  err.statusCode = statusCode
  return err
}

// What a valid request body must look like.
// The three razorpay_* fields are only required for online payments.
const bodySchema = z
  .object({
    addressId:           z.string().min(1, 'Address is required'),
    paymentMethod:       z.enum(['razorpay', 'cod']).default('razorpay'),
    couponCode:          z.string().optional(), // optional discount code
    razorpay_order_id:   z.string().optional(),
    razorpay_payment_id: z.string().optional(),
    razorpay_signature:  z.string().optional(),
  })
  .refine(
    (b) => b.paymentMethod === 'cod' ||
      (b.razorpay_order_id && b.razorpay_payment_id && b.razorpay_signature),
    { message: 'Missing Razorpay payment details' }
  )

// Compare two strings in "constant time". A plain === comparison
// leaks timing information an attacker could use to guess the
// signature character by character.
function safeEqual(a, b) {
  const bufA = Buffer.from(String(a))
  const bufB = Buffer.from(String(b))
  if (bufA.length !== bufB.length) return false
  return crypto.timingSafeEqual(bufA, bufB)
}

export const POST = withErrorLogging('api/payments/verify', async (req) => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, addressId, paymentMethod, couponCode } = parsed.data
  const isCod = paymentMethod === 'cod'

  // Make sure this user exists in OUR User table
  // (prevents "foreign key" database errors for new customers).
  await ensureUser(user)

  if (!isCod) {
    // CHECK 1: the signature proves this response came from Razorpay.
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex')

    if (!safeEqual(expectedSignature, razorpay_signature)) {
      await logError('api/payments/verify', 'Invalid payment signature', {
        userId: user.id, razorpay_order_id, razorpay_payment_id,
      })
      return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 })
    }

    // IDEMPOTENCY: if this payment already produced an order
    // (e.g. the webhook got there first, or the customer's browser
    // retried), return that order instead of creating a duplicate.
    const existing = await prisma.order.findUnique({
      where: { paymentId: razorpay_payment_id },
    })
    if (existing) return NextResponse.json({ orderId: existing.id })
  }

  // Recompute the cart total on the server — never trust the browser.
  const cartItems = await prisma.cart.findMany({
    where: { userId: user.id },
    include: { variant: true },
  })
  if (cartItems.length === 0) return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })

  // ---------- COUPON + TOTALS ----------
  // This EXACT same math also runs in lib/orders.js and
  // payments/create-order. All three copies must stay identical, or
  // a couponed payment would fail the amount check below.
  // Rule: discount comes off the subtotal FIRST, then shipping is
  // decided on the reduced amount (free at ₹3,000+), then
  // total = discounted subtotal + shipping.
  let discount, appliedCoupon, total
  try {
    const { subtotal } = computeTotals(cartItems)
    discount = 0
    appliedCoupon = null
    if (couponCode) {
      // Check the code against every rule (active, dates, usage
      // limit, minimum order).
      const result = await validateCouponOrThrow(couponCode, subtotal)
      // Some coupons are made for ONE specific customer only.
      if (result.coupon.userSpecific && result.coupon.userSpecific !== user.id) {
        throw userError('This coupon is not for your account', 400)
      }
      appliedCoupon = result.coupon
      discount = result.discount
    }
    const discountedSubtotal = subtotal - discount
    const shipping = discountedSubtotal >= SHIPPING_THRESHOLD ? 0 : SHIPPING_COST
    total = discountedSubtotal + shipping
  } catch (err) {
    // Coupon problems carry a customer-safe message and status code.
    if (err.statusCode) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    throw err
  }

  if (!isCod) {
    // CHECK 2 + 3: ask Razorpay what was actually paid, and by whom.
    const rzpOrder = await getRazorpay().orders.fetch(razorpay_order_id)

    if (Number(rzpOrder.amount) !== total) {
      // Amount mismatch = the cart changed after payment started.
      await logError('api/payments/verify', 'Payment amount does not match cart total', {
        userId: user.id, razorpay_order_id, razorpay_payment_id,
        paidAmount: rzpOrder.amount, cartTotal: total,
      })
      return NextResponse.json(
        { error: 'Payment amount does not match your cart total. Your cart may have changed — please try again.' },
        { status: 400 }
      )
    }

    if (rzpOrder.notes?.userId !== user.id) {
      // This payment was started by a different account.
      await logError('api/payments/verify', 'Payment belongs to a different user', {
        loggedInUserId: user.id, paymentUserId: rzpOrder.notes?.userId ?? null,
        razorpay_order_id, razorpay_payment_id,
      })
      return NextResponse.json(
        { error: 'This payment does not belong to your account.' },
        { status: 400 }
      )
    }
  }

  try {
    // The coupon code (if any) rides along so the order stores the
    // discount and counts the coupon use — for online AND COD orders.
    const order = await createOrderFromCart(user.id, addressId, {
      paymentMethod,
      paymentId:     isCod ? null : razorpay_payment_id,
      // COD: money not received yet, collect `total` at the door
      // (total already has the coupon discount taken off).
      paymentStatus: isCod ? 'pending' : 'paid',
      codAmount:     isCod ? total : null,
    }, appliedCoupon ? appliedCoupon.code : null)
    return NextResponse.json({ orderId: order.id })
  } catch (err) {
    // P2002 = the database's unique rule on paymentId fired because
    // another request created the order at the exact same moment.
    // That order is the real one — return it instead of failing.
    if (err.code === 'P2002' && razorpay_payment_id) {
      const existing = await prisma.order.findUnique({
        where: { paymentId: razorpay_payment_id },
      })
      if (existing) return NextResponse.json({ orderId: existing.id })
    }
    // Errors we wrote ourselves (address not found, out of stock...)
    // carry a status code and a message safe to show the customer.
    if (err.statusCode) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    throw err // anything else is logged by withErrorLogging
  }
})
