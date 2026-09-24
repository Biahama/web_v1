// ============================================================
// COUPON CHECK — the cart page calls this when "Apply" is clicked
// ============================================================
// It answers ONE question: "is this code valid for MY cart, and
// how much does it save?" The number returned here is computed
// by the SAME lib/coupons rules the payment server uses, so what
// the customer sees in the cart is what they will actually pay.
//
// Applying a code here does NOT reserve it — the real check (and
// the usage count) happens again when the order is created.
// ============================================================

import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { z } from 'zod'

import { prisma } from '@/lib/prisma'
import { computeTotals, formatPrice } from '@/lib/pricing'
import { validateCouponOrThrow } from '@/lib/coupons'
import { withErrorLogging } from '@/lib/logger'

// What a valid request body must look like.
const bodySchema = z.object({
  code: z.string().min(1, 'Please enter a coupon code'),
})

export const POST = withErrorLogging('api/coupons/validate', async (req) => {
  // Coupons apply to a saved cart, so the customer must be logged in.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Please log in first' }, { status: 401 })

  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  // The discount depends on the cart subtotal, so load THEIR cart.
  const cartItems = await prisma.cart.findMany({
    where: { userId: user.id },
    include: { variant: true },
  })
  if (cartItems.length === 0) {
    return NextResponse.json({ error: 'Your cart is empty' }, { status: 400 })
  }
  const { subtotal } = computeTotals(cartItems)

  try {
    // Shared rules: active, dates, usage limit, minimum order value.
    const { coupon, discount } = await validateCouponOrThrow(parsed.data.code, subtotal)

    // Some coupons are made for ONE specific customer only.
    if (coupon.userSpecific && coupon.userSpecific !== user.id) {
      return NextResponse.json({ error: 'This coupon is not for your account' }, { status: 400 })
    }

    // Best-effort analytics: note that a coupon was applied. If this
    // fails for any reason it must never block the customer.
    try {
      await prisma.analyticsEvent.create({
        data: { type: 'coupon_applied', productId: null, sessionKey: null, path: coupon.code },
      })
    } catch {
      // ignored on purpose — analytics is nice-to-have, never critical
    }

    return NextResponse.json({
      code: coupon.code,
      discount, // in paise — the cart page displays this exact number
      message: `Coupon applied — you save ${formatPrice(discount)}`,
    })
  } catch (err) {
    // Coupon problems carry a customer-safe message and status code
    // (e.g. "This coupon has expired").
    if (err.statusCode) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    throw err // anything unexpected -> logged by withErrorLogging
  }
})
