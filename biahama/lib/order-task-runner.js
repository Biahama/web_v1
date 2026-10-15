// Keep retry outcomes visible to both the scheduler and the admin recovery UI.
export async function runOrderTasks({ db, handlers, now = Date.now }, orderId, deadline = now() + 40000) {
  const tasks = await db.orderTask.findMany({ where: { completedAt: null, availableAt: { lte: new Date(now()) }, ...(orderId ? { orderId } : {}) }, take: 50, orderBy: { createdAt: 'asc' } })
  let processed = 0, failures = 0
  for (const task of tasks) {
    if (deadline - now() < (task.kind === 'refund' ? 30000 : 15000)) break
    const claimed = await db.orderTask.updateMany({
      where: { id: task.id, completedAt: null, availableAt: { lte: new Date(now()) } },
      data: { availableAt: new Date(now() + 5 * 60 * 1000), attempts: { increment: 1 } },
    })
    if (!claimed.count) continue
    processed++
    try {
      const handler = Object.hasOwn(handlers, task.kind) ? handlers[task.kind] : null
      if (typeof handler !== 'function') throw new Error(`Unknown order task: ${task.kind}`)
      await handler(task)
      await db.orderTask.update({ where: { id: task.id }, data: { completedAt: new Date(now()), lastError: null } })
    } catch (error) {
      failures++
      await db.orderTask.update({ where: { id: task.id }, data: { lastError: error.message, availableAt: new Date(now() + Math.min(60, 2 ** Math.min(task.attempts, 6)) * 60 * 1000) } })
    }
  }
  return { processed, failures }
}
