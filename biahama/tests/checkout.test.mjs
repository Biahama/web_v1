import { test, beforeEach, after } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { createCheckoutService } from '../lib/checkout-service.js'
import { updateOrderStatus } from '../lib/order-status-service.js'

// These tests truncate fixtures. They deliberately refuse any store database.
const url = process.env.TEST_DATABASE_URL
if (url && (!['127.0.0.1', 'localhost'].includes(new URL(url).hostname) || new URL(url).pathname !== '/biahama_test')) throw new Error('Tests require a localhost database named biahama_test')
const db = url ? new PrismaClient({ adapter: new PrismaPg({ connectionString: url, max: 8 }) }) : null
const integration = (name, fn) => test(name, { skip: !db }, fn)
let providerOrders, providerPayments, clock, gateway, service
beforeEach(async () => {
  if (!db) return
  await db.$executeRawUnsafe('TRUNCATE TABLE "User", "Product", "Coupon", "Checkout", "OrderTask" CASCADE')
  providerOrders = new Map(); providerPayments = new Map(); clock = new Date()
  gateway = {
    orders: {
      create: async data => { const order = { ...structuredClone(data), id: `order_${randomUUID()}` }; providerOrders.set(order.id, order); return order },
      fetch: async id => { if (!providerOrders.has(id)) throw new Error('Unknown provider order'); return providerOrders.get(id) },
      all: async ({ receipt }) => ({ items: [...providerOrders.values()].filter(order => order.receipt === receipt) }),
      fetchPayments: async orderId => ({ items: [...providerPayments.values()].filter(payment => payment.order_id === orderId) }),
    },
    payments: { fetch: async id => providerPayments.get(id) },
  }
  service = createCheckoutService({ db, gateway: () => gateway, now: () => clock })
})
after(async () => { if (db) await db.$disconnect() })
async function fixture({ variant, stock = 3, price = 100000 } = {}) {
  const user = await db.user.create({ data: { email: `${randomUUID()}@test.invalid` } })
  const address = await db.address.create({ data: { userId: user.id, fullName: 'Test Customer', phone: '9999999999', line1: 'Original address', pincode: '600001', city: 'Chennai', state: 'Tamil Nadu' } })
  if (!variant) {
    const product = await db.product.create({ data: { name: 'Original linen', slug: randomUUID(), category: 'Kurta' } })
    variant = await db.productVariant.create({ data: { productId: product.id, size: 'M', color: 'White', sku: randomUUID(), price, stockQty: stock } })
  }
  const cart = await db.cart.create({ data: { userId: user.id, variantId: variant.id, quantity: 1 } })
  return { user, address, variant, cart }
}
const begin = (f, coupon) => service.begin(f.user.id, f.address.id, coupon, randomUUID())
function capture(checkout, status = 'captured') {
  const payment = { id: `pay_${randomUUID()}`, order_id: checkout.razorpayOrderId, amount: checkout.totalAmount, currency: 'INR', status }
  providerPayments.set(payment.id, payment)
  return payment
}
const stock = async f => (await db.productVariant.findUnique({ where: { id: f.variant.id } })).stockQty
integration('capture uses frozen prices, coupon and address; preserves a changed cart', async () => {
  const f = await fixture()
  await db.coupon.create({ data: { code: 'FROZEN', type: 'flat', value: 10000, validFrom: new Date(clock - 1000), validUntil: new Date(+clock + 60000), usageLimit: 1 } })
  const checkout = await begin(f, 'FROZEN')
  await db.productVariant.update({ where: { id: f.variant.id }, data: { price: 500000 } })
  await db.address.update({ where: { id: f.address.id }, data: { line1: 'Changed address' } })
  await db.cart.update({ where: { id: f.cart.id }, data: { quantity: 2 } })
  clock = new Date(+clock + 120000)
  const order = await service.complete(capture(checkout), checkout.id, f.user.id)
  assert.equal(order.totalAmount, 99900)
  assert.equal(order.shippingAddress.line1, 'Original address')
  assert.equal((await db.orderItem.findFirst()).priceAtPurchase, 100000)
  assert.equal((await db.cart.findUnique({ where: { id: f.cart.id } })).quantity, 2)
  assert.equal(await stock(f), 2)
})
integration('two customers racing for the last item cannot oversell', async () => {
  const first = await fixture({ stock: 1 }); const second = await fixture({ variant: first.variant })
  const results = await Promise.allSettled([begin(first), begin(second)])
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1)
  assert.equal(await stock(first), 0)
  assert.equal(await db.checkout.count(), 1)
})
integration('two customers racing for the last coupon use reserve it once', async () => {
  const first = await fixture(); const second = await fixture()
  await db.coupon.create({ data: { code: 'LAST', type: 'flat', value: 10000, validFrom: new Date(clock - 1000), validUntil: new Date(+clock + 60000), usageLimit: 1 } })
  const results = await Promise.allSettled([begin(first, 'LAST'), begin(second, 'LAST')])
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1)
  assert.equal((await db.coupon.findUnique({ where: { code: 'LAST' } })).usedCount, 1)
  assert.equal(await stock(first) + await stock(second), 5)
})
integration('a failed multi-item reservation rolls back inventory and coupon usage', async () => {
  const f = await fixture()
  const product = await db.product.create({ data: { name: 'Sold out linen', slug: randomUUID(), category: 'Kurta' } })
  const unavailable = await db.productVariant.create({ data: { productId: product.id, size: 'M', color: 'White', sku: randomUUID(), price: 100000, stockQty: 0 } })
  await db.cart.create({ data: { userId: f.user.id, variantId: unavailable.id, quantity: 1 } })
  await db.coupon.create({ data: { code: 'ROLLBACK', type: 'flat', value: 10000, validFrom: new Date(clock - 1000), validUntil: new Date(+clock + 60000), usageLimit: 1 } })
  await assert.rejects(begin(f, 'ROLLBACK'))
  assert.equal(await stock(f), 3)
  assert.equal((await db.coupon.findUnique({ where: { code: 'ROLLBACK' } })).usedCount, 0)
  assert.equal(await db.checkout.count(), 0)
  assert.equal(providerOrders.size, 0)
})
integration('retrying the same checkout request reuses its snapshot and provider order', async () => {
  const f = await fixture(); const key = randomUUID()
  const first = await service.begin(f.user.id, f.address.id, null, key)
  const second = await service.begin(f.user.id, f.address.id, null, key)
  assert.equal(first.id, second.id)
  assert.equal(first.razorpayOrderId, second.razorpayOrderId)
  assert.equal(providerOrders.size, 1)
  assert.equal(await stock(f), 2)
})
integration('concurrent capture retries create one order and never regress shipping status', async () => {
  const f = await fixture(); const checkout = await begin(f); const payment = capture(checkout)
  const orders = await Promise.all([service.complete(payment), service.complete(payment)])
  assert.equal(orders[0].id, orders[1].id)
  await db.order.update({ where: { id: orders[0].id }, data: { status: 'shipped' } })
  assert.equal((await service.complete(payment)).status, 'shipped')
  assert.equal(await db.order.count(), 1)
  assert.equal(await db.orderTask.count(), 2)
  assert.equal(await stock(f), 2)
  assert.equal(await db.cart.count(), 0)
})
integration('authorized payments, wrong amounts, wrong currencies and another user cannot fulfil', async () => {
  const f = await fixture(); const checkout = await begin(f); const payment = capture(checkout)
  for (const [candidate, userId] of [[{ ...payment, status: 'authorized' }], [{ ...payment, amount: 1 }], [{ ...payment, currency: 'USD' }], [payment, randomUUID()]]) {
    await assert.rejects(service.complete(candidate, checkout.id, userId))
  }
  assert.equal(await db.order.count(), 0)
  assert.equal((await db.checkout.findUnique({ where: { id: checkout.id } })).paymentId, null)
})
integration('expired abandoned reservations release stock and coupon usage exactly once', async () => {
  const f = await fixture()
  await db.coupon.create({ data: { code: 'ONCE', type: 'percent', value: 10, validFrom: new Date(clock - 1000), validUntil: new Date(+clock + 3600000), usageLimit: 1 } })
  const checkout = await begin(f, 'ONCE'); clock = new Date(+clock + 31 * 60000)
  await service.reconcile(checkout); await service.reconcile(checkout)
  assert.equal(await stock(f), 3)
  assert.equal((await db.coupon.findUnique({ where: { code: 'ONCE' } })).usedCount, 0)
})
integration('a payment in flight retains its reservation after expiry', async () => {
  const f = await fixture(); const checkout = await begin(f); capture(checkout, 'authorized')
  clock = new Date(+clock + 31 * 60000); await service.reconcile(checkout)
  assert.equal(await stock(f), 2)
  assert.equal((await db.checkout.findUnique({ where: { id: checkout.id } })).status, 'awaiting_payment')
})
integration('provider timeout after creation recovers by receipt without the current cart', async () => {
  const f = await fixture(); const create = gateway.orders.create
  gateway.orders.create = async data => { await create(data); throw new Error('Timeout') }
  await assert.rejects(begin(f))
  const checkout = await db.checkout.findFirst(); const providerOrder = [...providerOrders.values()][0]
  capture({ ...checkout, razorpayOrderId: providerOrder.id })
  await db.cart.deleteMany()
  const order = await service.reconcile(checkout)
  assert.equal(order.totalAmount, checkout.totalAmount)
  assert.equal(await db.order.count(), 1)
})
integration('a late capture re-reserves available stock exactly once', async () => {
  const f = await fixture(); const checkout = await begin(f)
  clock = new Date(+clock + 31 * 60000); await service.reconcile(checkout)
  const payment = capture(checkout); await service.complete(payment); await service.complete(payment)
  assert.equal(await stock(f), 2)
  assert.equal(await db.order.count(), 1)
})
integration('late capture with sold-out stock creates a visible cancellation and durable refund', async () => {
  const f = await fixture({ stock: 1 }); const checkout = await begin(f)
  clock = new Date(+clock + 31 * 60000); await service.reconcile(checkout)
  await db.productVariant.update({ where: { id: f.variant.id }, data: { stockQty: 0 } })
  const order = await service.complete(capture(checkout))
  assert.equal(order.status, 'cancelled'); assert.equal(order.paymentStatus, 'refund_pending')
  assert.equal(await stock(f), 0)
  assert.equal(await db.orderTask.count({ where: { kind: 'refund' } }), 1)
  assert.equal(await db.orderTask.count({ where: { kind: 'loyalty' } }), 0)
  assert.equal(await db.cart.count(), 1)
})
integration('replacing an unpaid checkout releases old stock and saves the new address', async () => {
  const f = await fixture({ stock: 1 }); const first = await begin(f)
  await db.address.update({ where: { id: f.address.id }, data: { line1: 'New address' } })
  const second = await begin(f)
  assert.notEqual(first.id, second.id); assert.equal(second.shippingAddress.line1, 'New address')
  assert.equal(await stock(f), 0)
  assert.equal((await db.checkout.findUnique({ where: { id: first.id } })).status, 'expired')
})

integration('two cancellations restore inventory once and create one refund task', async () => {
  const f = await fixture(); const checkout = await begin(f)
  const order = await service.complete(capture(checkout))
  await Promise.all([updateOrderStatus(db, order.id, { status: 'cancelled' }), updateOrderStatus(db, order.id, { status: 'cancelled' })])
  assert.equal(await stock(f), 3)
  assert.equal(await db.orderTask.count({ where: { kind: 'refund' } }), 1)
  await assert.rejects(updateOrderStatus(db, order.id, { status: 'confirmed' }))
})
integration('a checkout snapshot protects its variant from permanent deletion', async () => {
  const f = await fixture(); await begin(f)
  await db.cart.deleteMany()
  await assert.rejects(db.productVariant.delete({ where: { id: f.variant.id } }))
})
integration('changed payment cannot overwrite a checkout already attached to capture', async () => {
  const f = await fixture(); const checkout = await begin(f); const payment = capture(checkout)
  await service.complete(payment)
  await assert.rejects(service.complete({ ...payment, id: 'pay_other' }))
  assert.equal((await db.checkout.findUnique({ where: { id: checkout.id } })).paymentId, payment.id)
  assert.equal(await db.order.count(), 1)
})
