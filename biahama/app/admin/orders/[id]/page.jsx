// ============================================================
// /admin/orders/<id> — one order's page
// ============================================================
// This server file only LOADS the order from the database; all
// the buttons and forms live in OrderDetail.jsx (a client
// component, because buttons need to run in the browser).
// ============================================================

import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import OrderDetail from '../OrderDetail'

// Always show fresh data — never a cached copy of this page.
export const dynamic = 'force-dynamic'

export default async function AdminOrderPage({ params }) {
  // Next.js gives params as a promise.
  const { id } = await params

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: true,
      user: { select: { email: true, name: true } },
    },
  })
  if (!order) notFound()

  // JSON round-trip turns dates into plain text so the order can
  // be handed to the client component safely.
  return <OrderDetail order={JSON.parse(JSON.stringify(order))} />
}
