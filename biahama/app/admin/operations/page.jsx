import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { missingEnvironment } from '@/lib/readiness'
import RecoveryButton from './RecoveryButton'
export const dynamic = 'force-dynamic'
export default async function OperationsPage() {
  const missing = missingEnvironment(process.env)
  let tasks = [], awaiting = 0, databaseError = false
  try {
  tasks = await prisma.orderTask.findMany({ where: { completedAt: null }, orderBy: { createdAt: 'asc' }, take: 50 })
  awaiting = await prisma.checkout.count({ where: { status: { in: ['creating', 'awaiting_payment'] } } })
  } catch { databaseError = true }
  return <div><h1>Store operations</h1>
    <p>{missing.length ? `Missing configuration: ${missing.join(', ')}` : 'Required environment variables are configured.'}</p>
    <p>Enable automatic payment capture in Razorpay, register the payment.captured webhook, and schedule /api/maintenance every five minutes with the CRON_SECRET bearer token.</p>
    <p>{awaiting} checkouts await reconciliation. {tasks.length}{tasks.length === 50 ? '+' : ''} tasks await completion.</p>
    {databaseError ? <p role="alert">Recovery tables are unavailable. Apply the launch SQL before running recovery.</p> : <RecoveryButton />}
    <table style={{ width: '100%', marginTop: 24, textAlign: 'left' }}><thead><tr><th>Order</th><th>Task</th><th>Attempts</th><th>Last error</th></tr></thead><tbody>{tasks.map(task => <tr key={task.id}><td><Link href={`/admin/orders/${task.orderId}`}>{task.orderId.slice(-8)}</Link></td><td>{task.kind}</td><td>{task.attempts}</td><td>{task.lastError || 'Queued'}</td></tr>)}</tbody></table>
  </div>
}
