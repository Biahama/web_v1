// ============================================================
// COUPONS — the ONE place discount math lives.
// ============================================================
// Both the cart (to show the discount) and the payment flow
// (to actually charge less) call these same functions, so the
// number the customer sees is always the number they pay.
// All amounts in PAISE.
// ============================================================

import { prisma } from './prisma'

function userError(message, statusCode = 400) {
  const err = new Error(message)
  err.statusCode = statusCode
  return err
}

/** Pure math: how much does this coupon take off this subtotal? */
export function computeDiscount(coupon, subtotal) {
  let discount = 0
  if (coupon.type === 'percent') {
    discount = Math.floor((subtotal * coupon.value) / 100)
    if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount)
  } else {
    // flat amount off (value is in paise)
    discount = coupon.value
  }
  // A discount can never exceed the subtotal.
  return Math.min(discount, subtotal)
}

/**
 * Check a code against the rules and return { coupon, discount }.
 * Throws a customer-safe error (with statusCode) if invalid.
 */
export async function validateCouponOrThrow(code, subtotal) {
  const cleaned = String(code || '').trim().toUpperCase()
  if (!cleaned) throw userError('Please enter a coupon code')

  const coupon = await prisma.coupon.findUnique({ where: { code: cleaned } })
  if (!coupon || !coupon.isActive) throw userError('Invalid coupon code')

  const now = new Date()
  if (now < coupon.validFrom) throw userError('This coupon is not active yet')
  if (now > coupon.validUntil) throw userError('This coupon has expired')
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
    throw userError('This coupon has been fully used')
  }
  if (coupon.minOrderValue && subtotal < coupon.minOrderValue) {
    throw userError(
      `This coupon needs a minimum order of ₹${(coupon.minOrderValue / 100).toLocaleString('en-IN')}`
    )
  }

  return { coupon, discount: computeDiscount(coupon, subtotal) }
}
