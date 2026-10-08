export function returnEligibility(order, now = new Date()) {
  if (order.status !== 'delivered') return 'Returns and exchanges open once your order is delivered.'
  if (order.paymentStatus === 'refunded' || order.paymentStatus === 'refund_pending') return 'This order already has a refund in progress or completed.'
  if (order.deliveredAt && now.getTime() > new Date(order.deliveredAt).getTime() + 14 * 86400000) return 'The 14-day return window has ended. Please contact customer care for assistance.'
  return null
}
