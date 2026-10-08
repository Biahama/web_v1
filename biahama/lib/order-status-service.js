export async function updateOrderStatus(db, id, data) {
  return db.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${id} FOR UPDATE`
    const existing = await tx.order.findUnique({ where: { id }, include: { items: true } })
    const fail = (message, statusCode = 409) => { throw Object.assign(new Error(message), { statusCode }) }
    if (!existing) fail('Order not found', 404)
    if (existing.status === 'cancelled' && data.status && data.status !== 'cancelled') fail('A cancelled order cannot be reopened')
    const stages = ['pending', 'confirmed', 'processing', 'shipped', 'delivered']
    if (data.status && data.status !== 'cancelled' && stages.indexOf(data.status) < stages.indexOf(existing.status)) fail('An order cannot move back to an earlier stage')
    if (['processing', 'shipped', 'delivered'].includes(data.status) && existing.paymentMethod !== 'cod' && existing.paymentStatus !== 'paid') fail('Payment must be confirmed before fulfilment')
    const changes = Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined).map(([key, value]) => [key, typeof value === 'string' ? value.trim() || null : value]))
    const tasks = []
    if (data.status === 'cancelled' && existing.status !== 'cancelled') {
      if (['shipped', 'delivered'].includes(existing.status)) fail('This parcel has already shipped. Handle its return before changing inventory.')
      for (const item of [...existing.items].sort((a, b) => a.variantId.localeCompare(b.variantId))) await tx.productVariant.update({ where: { id: item.variantId }, data: { stockQty: { increment: item.quantity } } })
      await tx.loyaltyTransaction.deleteMany({ where: { orderId: id } })
      if (existing.paymentMethod === 'razorpay' && existing.paymentStatus === 'paid') { changes.paymentStatus = 'refund_pending'; tasks.push({ orderId: id, kind: 'refund' }) }
      tasks.push({ orderId: id, kind: 'cancellation' })
    }
    if (data.status === 'shipped' && existing.status !== 'shipped') { changes.shippingStatus = 'in_transit'; tasks.push({ orderId: id, kind: 'shipped' }) }
    if (data.status === 'delivered' && existing.status !== 'delivered') {
      changes.shippingStatus = 'delivered'
      changes.deliveredAt = new Date()
      if (existing.paymentMethod === 'cod') { changes.paymentStatus = 'paid'; tasks.push({ orderId: id, kind: 'loyalty' }) }
    }
    const order = await tx.order.update({ where: { id }, data: changes })
    if (tasks.length) await tx.orderTask.createMany({ data: tasks, skipDuplicates: true })
    return order
  })
}
