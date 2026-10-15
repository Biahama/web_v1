import { prisma } from './prisma'
import { sendOrderConfirmationEmail, sendOrderShippedEmail } from './email'
import { creditPointsForOrder } from './loyalty'
import { getRazorpay } from './razorpay'
import { processRefund } from './refund-service'
import { runOrderTasks } from './order-task-runner'

export async function processOrderTasks(orderId, deadline = Date.now() + 40000) {
  const confirmation = task => sendOrderConfirmationEmail(task.orderId, { retryable: true, idempotencyKey: task.id })
  return runOrderTasks({ db: prisma, handlers: {
    confirmation,
    cancellation: confirmation,
    shipped: task => sendOrderShippedEmail(task.orderId, { retryable: true, idempotencyKey: task.id }),
    refund: task => processRefund({ db: prisma, gateway: getRazorpay() }, task),
    loyalty: task => creditPointsForOrder(task.orderId, { retryable: true }),
  } }, orderId, deadline)
}
