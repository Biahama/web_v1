import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { isSuccessfulDelivery } from '../lib/shiprocket-status.js'
import { publishedCollections } from '../lib/collections.js'
import { computeTotals } from '../lib/pricing.js'
import { runOrderTasks } from '../lib/order-task-runner.js'

test('delivery confirmation excludes failed, partial and return-to-origin delivery', () => {
  for (const status of ['Delivered', 'DELIVERED', ' Delivered ']) assert.equal(isSuccessfulDelivery(status), true)
  for (const status of ['Undelivered', 'RTO Delivered', 'Partial_Delivered', 'Not Delivered', 'In Transit', '', null, 7, {}]) {
    assert.equal(isSuccessfulDelivery(status), false, String(status))
  }
})

test('merchandising hides empty collections and automatically restores newly published ones', () => {
  assert.deepEqual(publishedCollections(['Kurta', 'trousers', 'tunics']).map(c => c.slug), ['kurtas', 'tunics', 'trousers'])
  assert.deepEqual(publishedCollections(['SHIRT']).map(c => c.slug), ['shirts'])
  assert.deepEqual(publishedCollections([]), [])
})

test('mixed apparel prices stay tax inclusive with only the disclosed shipping charge added', () => {
  assert.deepEqual(computeTotals([{ variant: { price: 245000 }, quantity: 1 }, { variant: { price: 320000 }, quantity: 2 }]), { subtotal: 885000, shipping: 0, total: 885000 })
  assert.deepEqual(computeTotals([{ variant: { price: 245000 }, quantity: 1 }]), { subtotal: 245000, shipping: 9900, total: 254900 })
  assert.deepEqual(computeTotals([]), { subtotal: 0, shipping: 0, total: 0 })
})

const url = process.env.TEST_DATABASE_URL
if (url && (!['127.0.0.1', 'localhost'].includes(new URL(url).hostname) || new URL(url).pathname !== '/biahama_test')) throw new Error('Tests require a localhost database named biahama_test')
const db = url ? new PrismaClient({ adapter: new PrismaPg({ connectionString: url, max: 2 }) }) : null
after(async () => { if (db) await db.$disconnect() })

test('a failed refund stays queued, is reported as a failure, and retries without resending completed email', { skip: !db }, async () => {
  const orderId = randomUUID()
  const clock = Date.now()
  await db.orderTask.createMany({ data: ['confirmation', 'refund'].map(kind => ({ id: randomUUID(), orderId, kind, availableAt: new Date(clock - 1000) })) })
  let emails = 0, refunds = 0
  const handlers = {
    confirmation: async () => { emails++ },
    refund: async () => { refunds++; throw new Error('Gateway temporarily unavailable') },
  }
  const result = await runOrderTasks({ db, handlers, now: () => clock }, orderId)
  assert.deepEqual(result, { processed: 2, failures: 1 })
  const tasks = await db.orderTask.findMany({ where: { orderId } })
  assert.ok(tasks.find(t => t.kind === 'confirmation').completedAt)
  const pending = tasks.find(t => t.kind === 'refund')
  assert.equal(pending.completedAt, null)
  assert.match(pending.lastError, /Gateway/)
  assert.equal(pending.attempts, 1)
  assert.ok(pending.availableAt.getTime() > clock)
  assert.deepEqual(await runOrderTasks({ db, handlers, now: () => clock }, orderId), { processed: 0, failures: 0 })
  handlers.refund = async () => { refunds++ }
  assert.deepEqual(await runOrderTasks({ db, handlers, now: () => clock + 120000 }, orderId), { processed: 1, failures: 0 })
  assert.equal(emails, 1)
  assert.equal(refunds, 2)
  const recovered = await db.orderTask.findUnique({ where: { id: pending.id } })
  assert.ok(recovered.completedAt)
  assert.equal(recovered.lastError, null)
})

test('a task claimed by another worker cannot execute a duplicate action', async () => {
  let executed = false
  const db = { orderTask: {
    findMany: async () => [{ id: 'task', kind: 'refund' }],
    updateMany: async () => ({ count: 0 }),
  } }
  assert.deepEqual(await runOrderTasks({ db, handlers: { refund: async () => { executed = true } } }), { processed: 0, failures: 0 })
  assert.equal(executed, false)
})
