import { prisma } from './prisma'
import { checkouts } from './checkouts'
import { processOrderTasks } from './order-tasks'
import { logError } from './logger'

export async function runMaintenance() {
  const deadline = Date.now() + 40000
  const tasks = await processOrderTasks(undefined, deadline)
  const pending = await prisma.checkout.findMany({ where: { OR: [{ status: { in: ['creating', 'awaiting_payment'] } }, { status: 'expired', paymentId: { not: null } }] }, orderBy: { updatedAt: 'asc' }, take: 20 })
  let checked = 0, failures = 0
  for (const checkout of pending) {
    if (deadline - Date.now() < 20000) break
    try { await checkouts.reconcile(checkout) } catch (error) {
      failures++
      await logError('checkout maintenance', error, { checkoutId: checkout.id })
    }
    await prisma.checkout.updateMany({ where: { id: checkout.id, status: { in: ['creating', 'awaiting_payment'] } }, data: { updatedAt: new Date() } })
    checked++
  }
  return { checked, failures, tasks }
}
