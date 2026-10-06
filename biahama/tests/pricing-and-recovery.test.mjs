import { test } from 'node:test'
import assert from 'node:assert/strict'
import { computeTotals } from '../lib/pricing.js'
import { safeReturnPath } from '../lib/auth-redirect.js'
import { processRefund } from '../lib/refund-service.js'

test('shipping threshold includes exactly ₹3,000; an empty bag has no shipping charge', () => {
  assert.equal(computeTotals([]).total, 0)
  assert.equal(computeTotals([{ variant: { price: 299999 }, quantity: 1 }]).shipping, 9900)
  assert.equal(computeTotals([{ variant: { price: 300000 }, quantity: 1 }]).shipping, 0)
})
test('login redirects allow local destinations and reject external or malformed paths', () => {
  assert.equal(safeReturnPath('/checkout?from=bag'), '/checkout?from=bag')
  for (const path of ['https://evil.test', '//evil.test', '/\\evil.test', '/\n/evil.test']) assert.equal(safeReturnPath(path), '/')
})
test('refund retry reconciles a successful provider call before sending more money', async () => {
  const order = { id: 'test-order', status: 'cancelled', paymentMethod: 'razorpay', paymentId: 'pay_test', paymentStatus: 'refund_pending', totalAmount: 100000 }
  let refunds = 0, failSave = true, refunded = 0
  const db = { order: { findUnique: async () => order, update: async () => { if (failSave) { failSave = false; throw new Error('Database unavailable') }; order.paymentStatus = 'refunded' } } }
  const gateway = { payments: {
    fetch: async () => ({ amount_refunded: refunded, refund_status: refunded ? 'full' : null }),
    fetchMultipleRefund: async () => ({ items: [] }),
    refund: async () => { refunds++; refunded = 100000; return { status: 'processed' } },
  } }
  await assert.rejects(processRefund({ db, gateway }, { id: 'task', orderId: order.id }))
  await processRefund({ db, gateway }, { id: 'task', orderId: order.id })
  assert.equal(refunds, 1); assert.equal(order.paymentStatus, 'refunded')
})
test('a pending provider refund never creates another refund', async () => {
  let requests = 0
  const db = { order: { findUnique: async () => ({ id: 'order', status: 'cancelled', paymentMethod: 'razorpay', paymentId: 'pay', paymentStatus: 'refund_pending', totalAmount: 100 }) } }
  const gateway = { payments: { fetch: async () => ({ amount_refunded: 0 }), fetchMultipleRefund: async () => ({ items: [{ status: 'pending', receipt: 'task' }] }), refund: async () => requests++ } }
  await assert.rejects(processRefund({ db, gateway }, { id: 'task', orderId: 'order' }))
  assert.equal(requests, 0)
})
