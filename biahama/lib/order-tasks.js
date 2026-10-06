import { prisma } from './prisma'
import { sendOrderConfirmationEmail, sendOrderShippedEmail } from './email'
import { creditPointsForOrder } from './loyalty'
import { getRazorpay } from './razorpay'
import { processRefund } from './refund-service'

export async function processOrderTasks(orderId, deadline = Date.now() + 40000) {
  const tasks = await prisma.orderTask.findMany({ where: { completedAt: null, availableAt: { lte: new Date() }, ...(orderId ? { orderId } : {}) }, take: 50, orderBy: { createdAt: 'asc' } })
  let processed = 0
  for (const task of tasks) {
    if (deadline - Date.now() < (task.kind === 'refund' ? 30000 : 15000)) break
    const claimed = await prisma.orderTask.updateMany({
      where: { id: task.id, completedAt: null, availableAt: { lte: new Date() } },
      data: { availableAt: new Date(Date.now() + 5 * 60 * 1000), attempts: { increment: 1 } },
    })
    if (!claimed.count) continue
    processed++
    try {
      if (['confirmation', 'cancellation'].includes(task.kind)) await sendOrderConfirmationEmail(task.orderId, { retryable: true, idempotencyKey: task.id })
      else if (task.kind === 'shipped') await sendOrderShippedEmail(task.orderId, { retryable: true, idempotencyKey: task.id })
      else if (task.kind === 'refund') await processRefund({ db: prisma, gateway: getRazorpay() }, task)
      else if (task.kind === 'loyalty') await creditPointsForOrder(task.orderId, { retryable: true })
      else throw new Error(`Unknown order task: ${task.kind}`)
      await prisma.orderTask.update({ where: { id: task.id }, data: { completedAt: new Date(), lastError: null } })
    } catch (error) {
      await prisma.orderTask.update({ where: { id: task.id }, data: { lastError: error.message, availableAt: new Date(Date.now() + Math.min(60, 2 ** Math.min(task.attempts, 6)) * 60 * 1000) } })
    }
  }
  return processed
}
