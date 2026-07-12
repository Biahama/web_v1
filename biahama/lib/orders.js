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
import { computeTotals } from './pricing'

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
 * @returns the created Order row
 */
export async function createOrderFromCart(userId, addressId, payment) {
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

  // One source of truth for pricing (GST is already inside the price).
  const { shipping, total } = computeTotals(cartItems)

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

  return prisma.$transaction(async (tx) => {
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

    // Empty the cart only after the order is safely created.
    await tx.cart.deleteMany({ where: { userId } })

    return order
  })
}
