// Always reconcile provider refunds before issuing one. This makes retries
// safe after a timeout or a process exit between refund and database update.
export async function processRefund({ db, gateway }, task) {
  const order = await db.order.findUnique({ where: { id: task.orderId } })
  if (!order || order.paymentStatus === 'refunded') return
  if (order.status !== 'cancelled' || order.paymentMethod !== 'razorpay' || !order.paymentId) throw new Error('Order is not eligible for this refund task')
  const payment = await gateway.payments.fetch(order.paymentId)
  if (Number(payment.amount_refunded) >= order.totalAmount && payment.refund_status === 'full') {
    await db.order.update({ where: { id: order.id }, data: { paymentStatus: 'refunded' } })
    return
  }
  const refunds = await gateway.payments.fetchMultipleRefund(order.paymentId, { count: 100 })
  const pending = refunds.items?.find(refund => refund.status !== 'failed' && (refund.receipt === task.id || refund.status === 'pending'))
  if (pending) throw new Error('Provider refund is pending; will reconcile on the next run')
  const refunded = (refunds.items || []).filter(refund => refund.status === 'processed').reduce((sum, refund) => sum + Number(refund.amount), 0)
  const remaining = order.totalAmount - Math.max(refunded, Number(payment.amount_refunded) || 0)
  if (remaining <= 0) {
    await db.order.update({ where: { id: order.id }, data: { paymentStatus: 'refunded' } })
    return
  }
  const refund = await gateway.payments.refund(order.paymentId, { amount: remaining, speed: 'normal', receipt: task.id, notes: { orderId: order.id } })
  if (refund.status !== 'processed') throw new Error('Provider refund is pending; will reconcile on the next run')
  await db.order.update({ where: { id: order.id }, data: { paymentStatus: 'refunded' } })
}
