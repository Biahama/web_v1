import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'
import { withErrorLogging } from '@/lib/logger'
import { reportPeriod, csvCell } from '@/lib/admin-insights'

export const GET = withErrorLogging('api/admin/reports/sales GET', async req => {
  await requireAdmin()
  const period = reportPeriod(new URL(req.url).searchParams.get('days'))
  const orders = await prisma.order.findMany({ where: { createdAt: { gte: period.start, lte: period.end } }, take: 10001, orderBy: { createdAt: 'desc' }, select: { id: true, createdAt: true, status: true, paymentStatus: true, paymentMethod: true, totalAmount: true, shippingAmount: true, discountAmount: true } })
  if (orders.length > 10000) return Response.json({ error: 'This export exceeds 10,000 orders. Choose a shorter reporting period.' }, { status: 400 })
  const rows = [['Order ID', 'Created at (IST)', 'Status', 'Payment status', 'Payment method', 'Total INR (incl GST)', 'Shipping INR', 'Discount INR'], ...orders.map(o => [o.id, new Date(o.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false }), o.status, o.paymentStatus, o.paymentMethod, (o.totalAmount / 100).toFixed(2), (o.shippingAmount / 100).toFixed(2), (o.discountAmount / 100).toFixed(2)])]
  return new Response('\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n'), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="biahama-orders-' + period.days + '-days.csv"', 'Cache-Control': 'private, no-store' } })
})
