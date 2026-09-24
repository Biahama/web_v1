// ============================================================
// LOYALTY POINTS
// ============================================================
// Earn rate is editable in the admin panel (Store settings).
// Default: 1 point per ₹100 spent.
// Points are credited when an order is PAID (online payments
// immediately; COD when the admin marks it delivered).
// The ledger's unique orderId means double-crediting is
// impossible, even if two systems try at the same time.
// ============================================================

import { prisma } from './prisma'
import { logError } from './logger'
import { getSiteSettings } from './site-settings'

/**
 * Credit points for an order. Safe to call multiple times —
 * only the first call for a given order does anything.
 * Never throws (logs failures instead): loyalty must never
 * break an order.
 */
export async function creditPointsForOrder(orderId) {
  try {
    const order = await prisma.order.findUnique({ where: { id: orderId } })
    if (!order) return

    const settings = await getSiteSettings()
    const per100 = Number(settings.commerce.loyaltyPointsPer100) || 0
    if (per100 <= 0) return // program disabled

    // totalAmount is in paise; ₹100 = 10,000 paise
    const points = Math.floor(order.totalAmount / 10000) * per100
    if (points <= 0) return

    await prisma.loyaltyTransaction.create({
      data: {
        userId: order.userId,
        orderId: order.id,
        points,
        reason: `Order — ₹${(order.totalAmount / 100).toLocaleString('en-IN')}`,
      },
    })
  } catch (error) {
    // Unique-constraint error = points already credited. That's fine.
    if (error?.code === 'P2002') return
    await logError('loyalty — credit points', error, { orderId })
  }
}

/** The user's current points balance. */
export async function getPointsBalance(userId) {
  const result = await prisma.loyaltyTransaction.aggregate({
    where: { userId },
    _sum: { points: true },
  })
  return result._sum.points ?? 0
}
