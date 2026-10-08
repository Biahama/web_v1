import { z } from 'zod'
import { returnEligibility } from './return-policy.js'

export const RETURN_STATUSES = ['requested', 'approved', 'received', 'resolved', 'rejected']
export const returnSchema = z.object({
  kind: z.enum(['return', 'exchange']),
  reason: z.string().trim().min(3, 'Please tell us the reason').max(200),
  details: z.string().trim().max(1500).optional(),
  items: z.array(z.object({ orderItemId: z.string().min(1), quantity: z.number().int().min(1).max(100) })).min(1, 'Select at least one piece').max(50),
}).refine(data => data.kind !== 'exchange' || Boolean(data.details?.trim()), 'Tell us which size you would like')
export const returnUpdateSchema = z.object({
  status: z.enum(RETURN_STATUSES),
  customerMessage: z.string().trim().max(1500).default(''),
  internalNotes: z.string().trim().max(2000).default(''),
  resolutionReference: z.string().trim().max(200).default(''),
})
export const CUSTOMER_RETURN_SELECT = { id: true, kind: true, reason: true, details: true, items: true, status: true, customerMessage: true, createdAt: true, updatedAt: true }

const fail = (message, statusCode = 409) => { throw Object.assign(new Error(message), { statusCode }) }
export async function requestReturn(db, userId, orderId, data, now = new Date()) {
  return db.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${orderId} FOR UPDATE`
    const order = await tx.order.findFirst({ where: { id: orderId, userId }, include: { items: true } })
    if (!order) fail('Order not found', 404)
    const existing = await tx.returnRequest.findUnique({ where: { orderId }, select: CUSTOMER_RETURN_SELECT })
    if (existing) return existing
    const error = returnEligibility(order, now)
    if (error) fail(error)
    if (new Set(data.items.map(item => item.orderItemId)).size !== data.items.length) fail('Select each piece only once', 400)
    const items = data.items.map(item => {
      const purchased = order.items.find(row => row.id === item.orderItemId)
      if (!purchased || item.quantity > purchased.quantity) fail('Selected pieces must belong to this order and cannot exceed the purchased quantity', 400)
      return { orderItemId: purchased.id, variantId: purchased.variantId, productName: purchased.productName, variantDetails: purchased.variantDetails, quantity: item.quantity }
    })
    return tx.returnRequest.create({ data: { ...data, items, orderId, userId, createdAt: now }, select: CUSTOMER_RETURN_SELECT })
  })
}

// State changes are serialized; a resolution records work performed, never claims to send money.
export async function updateReturn(db, id, data) {
  return db.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "ReturnRequest" WHERE id = ${id} FOR UPDATE`
    const existing = await tx.returnRequest.findUnique({ where: { id } })
    if (!existing) fail('Request not found', 404)
    const allowed = {
      requested: ['requested', 'approved', 'rejected'],
      approved: ['approved', 'received', 'rejected'],
      received: ['received', 'resolved', 'rejected'],
      resolved: ['resolved'], rejected: ['rejected'],
    }
    if (!allowed[existing.status]?.includes(data.status)) fail('This request cannot move to that stage')
    if (['approved', 'rejected', 'resolved'].includes(data.status) && !data.customerMessage) fail('Add an update for the customer before saving', 400)
    if (data.status === 'resolved' && !data.resolutionReference) fail('Record the completed refund or exchange shipment reference before resolving', 400)
    if (['resolved', 'rejected'].includes(existing.status) && data.resolutionReference !== (existing.resolutionReference || '')) fail('A closed request’s resolution reference cannot be changed')
    return tx.returnRequest.update({ where: { id }, data })
  })
}
