import crypto from 'node:crypto'
import { computeTotals, SHIPPING_THRESHOLD, SHIPPING_COST } from './pricing.js'

export function checkoutError(message, statusCode = 400) {
  return Object.assign(new Error(message), { statusCode })
}

// Dependencies are injected so payment, concurrency and retry scenarios can be
// tested with an isolated database without contacting a payment provider.
export function createCheckoutService({ db, gateway, now = () => new Date() }) {
  const lock = (tx, id) => tx.$queryRaw`SELECT id FROM "Checkout" WHERE id = ${id} FOR UPDATE`
  const reserve = async (tx, items) => {
    for (const item of [...items].sort((a, b) => a.variantId.localeCompare(b.variantId))) {
      const updated = await tx.productVariant.updateMany({
        where: { id: item.variantId, stockQty: { gte: item.quantity }, product: { isActive: true } },
        data: { stockQty: { decrement: item.quantity } },
      })
      if (updated.count !== 1) throw Object.assign(checkoutError(`${item.productName} is no longer available in this quantity`), { code: 'STOCK_UNAVAILABLE' })
    }
  }
  const release = async (tx, checkout) => {
    for (const item of checkout.items) {
      await tx.productVariant.update({ where: { id: item.variantId }, data: { stockQty: { increment: item.quantity } } })
    }
    if (checkout.couponCode) {
      await tx.coupon.updateMany({ where: { code: checkout.couponCode, usedCount: { gt: 0 } }, data: { usedCount: { decrement: 1 } } })
    }
  }

  async function begin(userId, addressId, couponCode, requestId) {
    const requestKey = `${userId}:${requestId}`
    const existing = await db.checkout.findUnique({ where: { requestKey } })
    if (existing) {
      if (existing.status === 'completed') return existing
      if (existing.status !== 'awaiting_payment' || existing.expiresAt <= now()) {
        throw checkoutError('This checkout has expired or is still being prepared. Start a new checkout.', 409)
      }
      return existing
    }
    // Reconcile a previous attempt before replacing it. A late capture stays
    // attached to its old snapshot and follows the refund/recovery path.
    const previous = await db.checkout.findMany({ where: { userId, status: { in: ['creating', 'awaiting_payment'] }, requestKey: { not: requestKey } } })
    for (const attempt of previous) {
      await db.checkout.updateMany({ where: { id: attempt.id, status: { in: ['creating', 'awaiting_payment'] } }, data: { expiresAt: now() } })
      const completed = await reconcile({ ...attempt, expiresAt: now() })
      if (completed) return db.checkout.findUnique({ where: { id: attempt.id } })
      const pending = await db.checkout.findUnique({ where: { id: attempt.id } })
      if (pending.status !== 'expired') throw checkoutError('A previous payment is still being confirmed. Please check your orders shortly.', 409)
    }
    const checkout = await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}))::text`
      const active = await tx.checkout.findFirst({ where: { userId, status: { in: ['creating', 'awaiting_payment'] } } })
      if (active) throw checkoutError('A checkout is already being prepared. Please try again shortly.', 409)
      const address = await tx.address.findFirst({ where: { id: addressId, userId } })
      if (!address) throw checkoutError('Address not found', 404)
      const cart = await tx.cart.findMany({ where: { userId }, include: { variant: { include: { product: { include: { images: { orderBy: { sortOrder: 'asc' }, take: 1 } } }, images: { orderBy: { sortOrder: 'asc' }, take: 1 } } } } })
      if (!cart.length) throw checkoutError('Cart is empty')
      const quantities = new Map()
      for (const row of cart) {
        if (!Number.isInteger(row.quantity) || row.quantity < 1 || row.quantity > 10) throw checkoutError('Invalid cart quantity')
        const prior = quantities.get(row.variantId)
        if (prior) { prior.quantity += row.quantity; prior.cartRows.push({ id: row.id, quantity: row.quantity, updatedAt: row.updatedAt.toISOString() }) }
        else quantities.set(row.variantId, {
          variantId: row.variantId, productId: row.variant.productId,
          productName: row.variant.product.name, quantity: row.quantity,
          priceAtPurchase: row.variant.price,
          imageUrl: row.variant.images?.[0]?.url || row.variant.product.images?.[0]?.url || null,
          variantDetails: { size: row.variant.size, color: row.variant.color, sku: row.variant.sku },
          cartRows: [{ id: row.id, quantity: row.quantity, updatedAt: row.updatedAt.toISOString() }],
        })
      }
      const items = [...quantities.values()]
      if (items.some(i => i.quantity > 10 || i.priceAtPurchase <= 0)) throw checkoutError('Please review your cart quantities')
      const { subtotal } = computeTotals(items.map(i => ({ variant: { price: i.priceAtPurchase }, quantity: i.quantity })))
      let discount = 0, applied = null
      if (couponCode) {
        applied = await tx.coupon.findUnique({ where: { code: couponCode.trim().toUpperCase() } })
        const date = now()
        if (!applied?.isActive || date < applied.validFrom || date > applied.validUntil ||
          (applied.userSpecific && applied.userSpecific !== userId) ||
          (applied.minOrderValue && subtotal < applied.minOrderValue)) throw checkoutError('This coupon is not available for your order')
        const used = await tx.coupon.updateMany({
          where: { id: applied.id, ...(applied.usageLimit != null ? { usedCount: { lt: applied.usageLimit } } : {}) },
          data: { usedCount: { increment: 1 } },
        })
        if (!used.count) throw checkoutError('This coupon has been fully used')
        discount = applied.type === 'percent' ? Math.floor(subtotal * applied.value / 100) : applied.value
        if (applied.maxDiscount != null) discount = Math.min(discount, applied.maxDiscount)
        discount = Math.max(0, Math.min(subtotal, discount))
      }
      const shipping = subtotal - discount >= SHIPPING_THRESHOLD ? 0 : SHIPPING_COST
      const { fullName, phone, line1, line2, pincode, city, state } = address
      await reserve(tx, items)
      return tx.checkout.create({ data: {
        userId, requestKey, fingerprint: crypto.createHash('sha256').update(JSON.stringify(items)).digest('hex'),
        shippingAddress: { fullName, phone, line1, line2: line2 || null, pincode, city, state },
        items, reservations: { create: items.map(item => ({ variantId: item.variantId, quantity: item.quantity })) }, totalAmount: subtotal - discount + shipping, shippingAmount: shipping,
        discountAmount: discount, couponCode: applied?.code || null,
        expiresAt: new Date(now().getTime() + 30 * 60 * 1000),
      } })
    }, { timeout: 15000 })
    try {
      const paymentOrder = await gateway().orders.create({
        amount: checkout.totalAmount, currency: 'INR', receipt: checkout.id,
        notes: { checkoutId: checkout.id, userId },
      })
      return await db.checkout.update({ where: { id: checkout.id }, data: { razorpayOrderId: paymentOrder.id, status: 'awaiting_payment' } })
    } catch (err) {
      // Do not release on an ambiguous provider/network error. The provider may
      // have created the order; maintenance reconciles it before releasing.
      throw err
    }
  }

  async function complete(payment, checkoutId, userId) {
    if (payment.status !== 'captured') throw checkoutError('Payment is awaiting confirmation. Please check your orders shortly.', 409)
    const providerOrder = await gateway().orders.fetch(payment.order_id)
    const id = checkoutId || providerOrder.notes?.checkoutId
    if (!id) {
      const legacy = await db.order.findUnique({ where: { paymentId: payment.id } })
      if (legacy && legacy.totalAmount === Number(payment.amount) && payment.currency === 'INR' && (!userId || legacy.userId === userId) && providerOrder.notes?.userId === legacy.userId) return legacy
      throw checkoutError('Payment cannot be matched to a checkout. An administrator must reconcile this legacy payment.', 409)
    }
    const checkout = await db.checkout.findUnique({ where: { id } })
    if (!checkout || (userId && checkout.userId !== userId) || providerOrder.notes?.checkoutId !== checkout.id ||
      providerOrder.notes?.userId !== checkout.userId ||
      (checkout.razorpayOrderId && checkout.razorpayOrderId !== payment.order_id) ||
      payment.currency !== 'INR' || Number(payment.amount) !== checkout.totalAmount ||
      providerOrder.currency !== 'INR' || Number(providerOrder.amount) !== checkout.totalAmount) throw checkoutError('Payment details do not match this checkout', 400)
    // Persist capture before fulfilment so maintenance can retry even if the
    // process stops after the provider confirms payment. Never overwrite a
    // different payment attached to the same checkout.
    const attached = await db.checkout.updateMany({ where: { id, OR: [{ paymentId: null }, { paymentId: payment.id }] }, data: { paymentId: payment.id, razorpayOrderId: payment.order_id } })
    if (!attached.count) throw checkoutError('This checkout has already been paid', 409)
    async function finish(refundRequired = false) {
    return db.$transaction(async (tx) => {
      await lock(tx, id)
      const current = await tx.checkout.findUnique({ where: { id } })
      if (current.orderId) {
        if (current.paymentId !== payment.id) throw checkoutError('This checkout has already been paid', 409)
        return tx.order.findUnique({ where: { id: current.orderId } })
      }
      // Late capture remains attached to this frozen checkout. Re-reserve stock
      // if the reservation was released; failure returns 503 for webhook retry.
      if (current.status === 'expired' && !refundRequired) {
        await reserve(tx, current.items)
        if (current.couponCode) await tx.coupon.update({ where: { code: current.couponCode }, data: { usedCount: { increment: 1 } } })
      }
      const order = await tx.order.create({ data: {
        userId: current.userId, status: refundRequired ? 'cancelled' : 'confirmed', totalAmount: current.totalAmount,
        shippingAmount: current.shippingAmount, discountAmount: current.discountAmount,
        couponCode: current.couponCode, shippingAddress: current.shippingAddress,
        paymentMethod: 'razorpay', paymentId: payment.id, paymentStatus: refundRequired ? 'refund_pending' : 'paid',
        items: { create: current.items.map(item => ({ variantId: item.variantId, productId: item.productId, productName: item.productName, quantity: item.quantity, priceAtPurchase: item.priceAtPurchase, variantDetails: item.variantDetails, total: item.priceAtPurchase * item.quantity })) },
      } })
      await tx.checkout.update({ where: { id }, data: { status: 'completed', paymentId: payment.id, razorpayOrderId: payment.order_id, orderId: order.id } })
      // Remove only unchanged cart rows purchased in this checkout. Items added
      // or edited in another tab are not wiped out by payment confirmation.
      if (!refundRequired) for (const item of current.items) for (const row of item.cartRows) {
        await tx.cart.deleteMany({ where: { id: row.id, userId: current.userId, quantity: row.quantity, updatedAt: new Date(row.updatedAt) } })
      }
      await tx.orderTask.createMany({ data: refundRequired ? [{ orderId: order.id, kind: 'refund' }, { orderId: order.id, kind: 'confirmation' }] : [{ orderId: order.id, kind: 'confirmation' }, { orderId: order.id, kind: 'loyalty' }], skipDuplicates: true })
      return order
    }, { timeout: 15000 })
    }
    try { return await finish() } catch (error) {
      // All attempted re-reservations rolled back. A late payment with sold-out
      // stock becomes a visible cancelled order with a durable refund task.
      if (error.code !== 'STOCK_UNAVAILABLE') throw error
      return finish(true)
    }
  }

  async function reconcile(checkout) {
    if (checkout.paymentId) return complete(await gateway().payments.fetch(checkout.paymentId), checkout.id)
    let providerOrderId = checkout.razorpayOrderId
    if (!providerOrderId) {
      // A process may stop after provider creation but before saving its ID.
      // Receipt links that orphaned provider order back to our durable checkout.
      const found = await gateway().orders.all({ receipt: checkout.id, count: 100 })
      providerOrderId = found.items?.find(o => o.receipt === checkout.id)?.id
    }
    if (providerOrderId) {
      const payments = await gateway().orders.fetchPayments(providerOrderId)
      const captured = payments.items?.find(p => p.status === 'captured')
      if (captured) return complete(captured, checkout.id)
      if (payments.items?.some(p => p.status === 'authorized')) return null // never release a payment in flight
    }
    if (checkout.expiresAt > now()) return null
    await db.$transaction(async (tx) => {
      await lock(tx, checkout.id)
      const current = await tx.checkout.findUnique({ where: { id: checkout.id } })
      if (!['creating', 'awaiting_payment'].includes(current.status) || current.paymentId) return
      await release(tx, current)
      await tx.checkout.update({ where: { id: current.id }, data: { status: 'expired' } })
    })
    return null
  }
  return { begin, complete, reconcile }
}
