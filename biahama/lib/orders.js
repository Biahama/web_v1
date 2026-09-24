// ============================================================
// SHARED ORDER CREATION — turns a customer's cart into an Order
// ============================================================
// Used by BOTH:
//   - the payment "verify" API (normal checkout flow)
//   - the Razorpay webhook (backup: customer paid but closed the
//     browser before the order could be created)
//
// Everything runs inside ONE database transaction:
//   1. check every item is still in stock (names the product if not)
//   2. reduce stock counts
//   3. create the Order with its items
//   4. empty the cart
// Either ALL of it happens or NONE of it does — no half-orders.
// ============================================================

import { prisma } from './prisma'
import { computeTotals, SHIPPING_THRESHOLD, SHIPPING_COST } from './pricing'
import { validateCouponOrThrow } from './coupons'
import { sendOrderConfirmationEmail } from './email'
import { creditPointsForOrder } from './loyalty'

// An error whose message is safe to show the customer,
// with the right HTTP status code attached for the API route.
function userError(message, statusCode) {
  const err = new Error(message)
  err.statusCode = statusCode
  return err
}

/**
 * Create an order from everything currently in the user's cart.
 *
 * @param {string} userId    - our User table id (same as Supabase id)
 * @param {string} addressId - which saved address to ship to
 * @param {object} payment   - { paymentMethod, paymentId, paymentStatus, codAmount }
 * @param {string} [couponCode] - optional coupon code to apply (re-checked here)
 * @returns the created Order row
 */
export async function createOrderFromCart(userId, addressId, payment, couponCode = null) {
  const { paymentMethod, paymentId, paymentStatus, codAmount } = payment

  // The address must belong to THIS user — never ship using
  // an address id that belongs to someone else.
  const address = await prisma.address.findFirst({
    where: { id: addressId, userId },
  })
  if (!address) throw userError('Address not found', 404)

  const cartItems = await prisma.cart.findMany({
    where: { userId },
    include: {
      variant: {
        include: { product: { select: { id: true, name: true } } },
      },
    },
  })
  if (cartItems.length === 0) throw userError('Cart is empty', 400)

  // ---------- COUPON + TOTALS ----------
  // This EXACT same math also runs in payments/create-order and
  // payments/verify. All three copies must stay identical, or the
  // amount Razorpay charged won't match the order we create here.
  // Rule: discount comes off the subtotal FIRST, then shipping is
  // decided on the reduced amount (free at ₹3,000+), then
  // total = discounted subtotal + shipping.
  const { subtotal } = computeTotals(cartItems)
  let discount = 0
  let appliedCoupon = null
  if (couponCode) {
    // Re-check the code against every rule (active, dates, usage
    // limit, minimum order) — never trust an earlier check.
    const result = await validateCouponOrThrow(couponCode, subtotal)
    // Some coupons are made for ONE specific customer only.
    if (result.coupon.userSpecific && result.coupon.userSpecific !== userId) {
      throw userError('This coupon is not for your account', 400)
    }
    appliedCoupon = result.coupon
    discount = result.discount
  }
  const discountedSubtotal = subtotal - discount
  const shipping = discountedSubtotal >= SHIPPING_THRESHOLD ? 0 : SHIPPING_COST
  const total = discountedSubtotal + shipping

  // Snapshot the address into the order, so the order still shows
  // where it was shipped even if the customer later edits the address.
  const shippingAddress = {
    fullName: address.fullName,
    phone:    address.phone,
    line1:    address.line1,
    line2:    address.line2 || null,
    pincode:  address.pincode,
    city:     address.city,
    state:    address.state,
  }

  const createdOrder = await prisma.$transaction(async (tx) => {
    // Check and reduce stock one item at a time, so if something
    // sold out we can tell the customer exactly WHICH product.
    for (const item of cartItems) {
      const variant = await tx.productVariant.findUnique({ where: { id: item.variantId } })
      if (!variant || variant.stockQty < item.quantity) {
        throw userError(`Insufficient stock for ${item.variant.product.name}`, 400)
      }
      await tx.productVariant.update({
        where: { id: item.variantId },
        data:  { stockQty: { decrement: item.quantity } },
      })
    }

    const order = await tx.order.create({
      data: {
        userId,
        status:          'confirmed',
        totalAmount:     total,
        shippingAmount:  shipping,
        // Keep a record of the discount on the order itself, so the
        // owner can always see why this order was cheaper.
        discountAmount:  discount,
        couponCode:      appliedCoupon ? appliedCoupon.code : null,
        paymentMethod,
        paymentId:       paymentId || null,
        paymentStatus,
        codAmount:       codAmount ?? null,
        shippingAddress,
        items: {
          create: cartItems.map(item => ({
            productId:       item.variant.product.id,
            variantId:       item.variantId,
            productName:     item.variant.product.name,
            variantDetails:  { size: item.variant.size, color: item.variant.color, sku: item.variant.sku },
            quantity:        item.quantity,
            priceAtPurchase: item.variant.price,
            total:           item.variant.price * item.quantity,
          })),
        },
      },
    })

    // COUPON BOOKKEEPING: count this use of the coupon — but ONLY
    // if it still has uses left. Two customers can try to grab the
    // last use at the same moment; this database-level guard makes
    // sure only one of them succeeds (the other order is cancelled
    // by the transaction rolling back).
    if (appliedCoupon) {
      const updated = await tx.coupon.updateMany({
        where: {
          code: appliedCoupon.code,
          OR: [
            { usageLimit: null }, // no limit — always allowed
            // still under the limit (the ?? 0 is never used when
            // usageLimit is null, because the line above matches)
            { usedCount: { lt: appliedCoupon.usageLimit ?? 0 } },
          ],
        },
        data: { usedCount: { increment: 1 } },
      })
      if (updated.count === 0) {
        throw userError('This coupon has been fully used', 400)
      }
    }

    // Empty the cart only after the order is safely created.
    await tx.cart.deleteMany({ where: { userId } })

    return order
  })

  // ---- AFTER the order is safely saved (never block or undo it): ----
  // 1. confirmation email  2. loyalty points (online payments only —
  // COD earns points when the admin marks it delivered).
  // Both functions handle their own failures via the ErrorLog.
  sendOrderConfirmationEmail(createdOrder.id)
  if (createdOrder.paymentStatus === 'paid') {
    creditPointsForOrder(createdOrder.id)
  }

  return createdOrder
}
