import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { addressSchema, addressUpdateSchema, saveAddress, deleteAddress } from '../lib/address-service.js'
import { returnEligibility } from '../lib/return-policy.js'
import { requestReturn, updateReturn, returnSchema, CUSTOMER_RETURN_SELECT } from '../lib/return-service.js'
import { reportPeriod, csvCell } from '../lib/admin-insights.js'
import { filterCatalog } from '../lib/catalog-filters.js'

const url = process.env.TEST_DATABASE_URL
if (url && (!['127.0.0.1', 'localhost'].includes(new URL(url).hostname) || new URL(url).pathname !== '/biahama_test')) throw new Error('Tests require a localhost database named biahama_test')
const db = url ? new PrismaClient({ adapter: new PrismaPg({ connectionString: url, max: 5 }) }) : null
const integration = (name, fn) => test(name, { skip: !db }, fn)
after(async () => { if (db) await db.$disconnect() })
const validAddress = { fullName: 'Test Customer', phone: '9999999999', line1: '123 Test Street', city: 'Chennai', state: 'Tamil Nadu', pincode: '600001' }
const userFixture = () => db.user.create({ data: { email: randomUUID() + '@test.invalid' } })
const delivered = { status: 'delivered', paymentStatus: 'paid', deliveredAt: '2026-09-23T10:00:00Z' }

test('address validation trims input, rejects malformed details, and cannot reassign ownership', () => {
  const parsed = addressSchema.parse({ ...validAddress, fullName: '  Test Customer  ', userId: 'another-user' })
  assert.equal(parsed.fullName, 'Test Customer'); assert.equal('userId' in parsed, false)
  for (const bad of [{ fullName: '  ' }, { phone: '+19999999999' }, { pincode: '000000' }]) assert.equal(addressSchema.safeParse({ ...validAddress, ...bad }).success, false)
  assert.equal(addressUpdateSchema.safeParse({ userId: 'another-user' }).success, false)
})
test('return eligibility respects delivery and the exact 14-day boundary', () => {
  assert.equal(returnEligibility(delivered, new Date('2026-10-07T10:00:00Z')), null)
  assert.match(returnEligibility(delivered, new Date('2026-10-07T10:00:00.001Z')), /ended/)
  assert.match(returnEligibility({ ...delivered, status: 'shipped' }), /delivered/)
  assert.match(returnEligibility({ ...delivered, paymentStatus: 'refunded' }), /refund/)
  assert.equal(returnEligibility({ ...delivered, deliveredAt: null }), null)
})
test('exchange requests need a requested size; customers never receive internal notes', () => {
  assert.equal(returnSchema.safeParse({ kind: 'exchange', reason: 'Size or fit', items: [{ orderItemId: 'item', quantity: 1 }] }).success, false)
  assert.equal('internalNotes' in CUSTOMER_RETURN_SELECT, false)
  assert.equal('resolutionReference' in CUSTOMER_RETURN_SELECT, false)
})
test('reporting starts at midnight IST and defaults to 30 days', () => {
  const period = reportPeriod(7, new Date('2026-10-07T20:00:00Z'))
  assert.equal(period.start.toISOString(), '2026-10-01T18:30:00.000Z')
  assert.equal(reportPeriod('invalid').days, 30)
})
test('CSV exports neutralize formulas and escape commas and quotes', () => {
  assert.equal(csvCell('=HYPERLINK("https://example.test")').startsWith('"\''), true)
  assert.equal(csvCell('a,b"c'), '"a,b""c"')
  assert.equal(csvCell('  +SUM(1,2)').startsWith('"\''), true)
})
test('catalog size, colour, and stock must match the same variant', () => {
  const products = [
    { name: 'First', price: 200, variants: [{ size: 'M', color: 'Blue', stockQty: 0 }, { size: 'S', color: 'White', stockQty: 5 }] },
    { name: 'Second', price: 100, variants: [{ size: 'M', color: 'Blue', stockQty: 2 }] },
  ]
  assert.deepEqual(filterCatalog(products, { size: 'M', color: 'Blue', availability: 'in-stock' }).map(p => p.name), ['Second'])
  assert.deepEqual(filterCatalog(products, { sort: 'price-asc' }).map(p => p.price), [100, 200])
  assert.equal(products[0].price, 200)
})

integration('address CRUD preserves exactly one default and refuses another customer’s address', async () => {
  const user = await userFixture(); const other = await userFixture()
  const first = await saveAddress(db, user.id, validAddress)
  assert.equal(first.isDefault, true)
  const second = await saveAddress(db, user.id, { ...validAddress, line1: '456 Second Street' })
  assert.equal(second.isDefault, false)
  await assert.rejects(saveAddress(db, other.id, { city: 'Mumbai' }, first.id), error => error.statusCode === 404)
  await assert.rejects(deleteAddress(db, other.id, first.id), error => error.statusCode === 404)
  await saveAddress(db, user.id, { isDefault: true }, second.id)
  assert.equal(await db.address.count({ where: { userId: user.id, isDefault: true } }), 1)
  await deleteAddress(db, user.id, second.id)
  assert.equal((await db.address.findUnique({ where: { id: first.id } })).isDefault, true)
})
integration('simultaneous new default addresses cannot leave two defaults', async () => {
  const user = await userFixture()
  await Promise.all([saveAddress(db, user.id, { ...validAddress, isDefault: true }), saveAddress(db, user.id, { ...validAddress, isDefault: true })])
  assert.equal(await db.address.count({ where: { userId: user.id } }), 2)
  assert.equal(await db.address.count({ where: { userId: user.id, isDefault: true } }), 1)
})
integration('a failed default address update rolls back clearing the original default', async () => {
  const user = await userFixture()
  const first = await saveAddress(db, user.id, validAddress)
  await assert.rejects(saveAddress(db, user.id, { ...validAddress, isDefault: true, line1: null }))
  assert.equal((await db.address.findUnique({ where: { id: first.id } })).isDefault, true)
})
async function orderFixture() {
  const user = await userFixture()
  const product = await db.product.create({ data: { name: 'Test Linen', slug: randomUUID(), category: 'Kurta' } })
  const variant = await db.productVariant.create({ data: { productId: product.id, sku: randomUUID(), size: 'M', color: 'White', price: 100000, stockQty: 3 } })
  const order = await db.order.create({ data: { userId: user.id, status: 'delivered', paymentStatus: 'paid', deliveredAt: new Date(), totalAmount: 200000, paymentMethod: 'razorpay', shippingAddress: validAddress, items: { create: { productId: product.id, variantId: variant.id, productName: product.name, variantDetails: { size: 'M', color: 'White' }, quantity: 2, priceAtPurchase: 100000, total: 200000 } } }, include: { items: true } })
  return { user, order, variant, data: { kind: 'return', reason: 'Size or fit', items: [{ orderItemId: order.items[0].id, quantity: 1 }] } }
}
integration('returns enforce order ownership and item quantities, and retries create one request', async () => {
  const f = await orderFixture(); const other = await userFixture()
  await assert.rejects(requestReturn(db, other.id, f.order.id, f.data), error => error.statusCode === 404)
  for (const items of [[{ orderItemId: 'foreign-item', quantity: 1 }], [{ orderItemId: f.order.items[0].id, quantity: 3 }], [f.data.items[0], f.data.items[0]]]) await assert.rejects(requestReturn(db, f.user.id, f.order.id, { ...f.data, items }), error => error.statusCode === 400)
  const [first, retry] = await Promise.all([requestReturn(db, f.user.id, f.order.id, f.data), requestReturn(db, f.user.id, f.order.id, f.data)])
  assert.equal(first.id, retry.id)
  assert.equal(await db.returnRequest.count({ where: { orderId: f.order.id } }), 1)
  assert.equal((await db.productVariant.findUnique({ where: { id: f.variant.id } })).stockQty, 3)
})
integration('return resolution requires receipt and a completed reference; closed requests cannot reopen', async () => {
  const f = await orderFixture()
  const request = await requestReturn(db, f.user.id, f.order.id, f.data)
  await assert.rejects(updateReturn(db, request.id, { status: 'resolved', customerMessage: 'Refunded', resolutionReference: 'rf_test' }), error => error.statusCode === 409)
  await assert.rejects(updateReturn(db, request.id, { status: 'approved', customerMessage: '' }), error => error.statusCode === 400)
  await updateReturn(db, request.id, { status: 'approved', customerMessage: 'Please contact us to arrange pickup.' })
  await updateReturn(db, request.id, { status: 'received', customerMessage: 'We have received your piece.' })
  await assert.rejects(updateReturn(db, request.id, { status: 'resolved', customerMessage: 'Refund completed', resolutionReference: '' }), error => error.statusCode === 400)
  const result = await updateReturn(db, request.id, { status: 'resolved', customerMessage: 'Refund completed', resolutionReference: 'rf_test' })
  assert.equal(result.status, 'resolved')
  await assert.rejects(updateReturn(db, request.id, { status: 'approved', customerMessage: 'Reopen', resolutionReference: 'rf_test' }), error => error.statusCode === 409)
  assert.equal((await db.order.findUnique({ where: { id: f.order.id } })).paymentStatus, 'paid') // this service records resolution; it does not claim to issue a refund
})
integration('inventory optimistic updates cannot overwrite a newer reservation', async () => {
  const f = await orderFixture()
  await db.productVariant.update({ where: { id: f.variant.id }, data: { stockQty: { decrement: 1 } } })
  const stale = await db.productVariant.updateMany({ where: { id: f.variant.id, stockQty: 3 }, data: { stockQty: 20 } })
  assert.equal(stale.count, 0)
  assert.equal((await db.productVariant.findUnique({ where: { id: f.variant.id } })).stockQty, 2)
})
