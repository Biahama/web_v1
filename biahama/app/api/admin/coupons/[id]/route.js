// ============================================================
// ADMIN API: edit or delete ONE coupon
// ============================================================
//   PATCH  /api/admin/coupons/<id>  -> change any of its fields
//                                      (also used to toggle Active)
//   DELETE /api/admin/coupons/<id>  -> delete it — but ONLY if no
//                                      order ever used the code.
//                                      If orders used it, we just
//                                      deactivate it instead, so
//                                      order history stays intact.
//
// SECURITY: only admins (emails in ADMIN_EMAILS) may use this.
// MONEY: stored in PAISE. The admin form converts from rupees.
// ============================================================

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'
import { withErrorLogging } from '@/lib/logger'

// Same fields as "create", but everything is optional — the form
// only sends what changed.
const patchSchema = z.object({
  code:          z.string().min(3, 'The code must be at least 3 characters').optional(),
  type:          z.enum(['percent', 'flat']).optional(),
  value:         z.number().int().positive('The discount value must be a positive number').optional(),
  minOrderValue: z.number().int().positive().optional().nullable(),
  maxDiscount:   z.number().int().positive().optional().nullable(),
  usageLimit:    z.number().int().positive().optional().nullable(),
  validFrom:     z.string().optional(),
  validUntil:    z.string().optional(),
  isActive:      z.boolean().optional(),
})

// ------------------------------------------------------------
// PATCH — update the provided fields on one coupon.
// ------------------------------------------------------------
export const PATCH = withErrorLogging('api/admin/coupons PATCH', async (req, { params }) => {
  try {
    await requireAdmin()
    const { id } = await params

    const existing = await prisma.coupon.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Coupon not found' }, { status: 404 })
    }

    const parsed = patchSchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }
    const data = parsed.data

    // Only touch the fields the form actually sent.
    const updates = {}
    if (data.code !== undefined)          updates.code = data.code.trim().toUpperCase()
    if (data.type !== undefined)          updates.type = data.type
    if (data.value !== undefined)         updates.value = data.value
    if (data.minOrderValue !== undefined) updates.minOrderValue = data.minOrderValue
    if (data.maxDiscount !== undefined)   updates.maxDiscount = data.maxDiscount
    if (data.usageLimit !== undefined)    updates.usageLimit = data.usageLimit
    if (data.isActive !== undefined)      updates.isActive = data.isActive
    if (data.validFrom !== undefined) {
      const from = new Date(data.validFrom)
      if (isNaN(from)) return NextResponse.json({ error: 'Please pick a valid start date' }, { status: 400 })
      updates.validFrom = from
    }
    if (data.validUntil !== undefined) {
      const until = new Date(data.validUntil)
      if (isNaN(until)) return NextResponse.json({ error: 'Please pick a valid end date' }, { status: 400 })
      // The coupon works for the WHOLE end day (until 23:59:59).
      until.setHours(23, 59, 59, 999)
      updates.validUntil = until
    }

    // A percent bigger than 100 makes no sense.
    const finalType  = updates.type  ?? existing.type
    const finalValue = updates.value ?? existing.value
    if (finalType === 'percent' && finalValue > 100) {
      return NextResponse.json(
        { error: 'A percent discount cannot be more than 100' },
        { status: 400 }
      )
    }

    // The dates must still make sense together after the change.
    const finalFrom  = updates.validFrom  ?? existing.validFrom
    const finalUntil = updates.validUntil ?? existing.validUntil
    if (finalUntil < finalFrom) {
      return NextResponse.json(
        { error: 'The end date must be after the start date' },
        { status: 400 }
      )
    }

    const coupon = await prisma.coupon.update({ where: { id }, data: updates })
    return NextResponse.json({ coupon })
  } catch (err) {
    // P2002 = the database refused a duplicate code.
    if (err.code === 'P2002') {
      return NextResponse.json(
        { error: 'A coupon with that code already exists' },
        { status: 400 }
      )
    }
    if (err.statusCode) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    throw err
  }
})

// ------------------------------------------------------------
// DELETE — remove the coupon, unless an order ever used it.
// In that case we only deactivate it, so old orders can still
// show which coupon gave them their discount.
// ------------------------------------------------------------
export const DELETE = withErrorLogging('api/admin/coupons DELETE', async (req, { params }) => {
  try {
    await requireAdmin()
    const { id } = await params

    const coupon = await prisma.coupon.findUnique({ where: { id } })
    if (!coupon) {
      return NextResponse.json({ error: 'Coupon not found' }, { status: 404 })
    }

    // How many real orders used this code?
    const ordersUsingIt = await prisma.order.count({
      where: { couponCode: coupon.code },
    })

    if (ordersUsingIt > 0) {
      // Never delete history — deactivate instead.
      const updated = await prisma.coupon.update({
        where: { id },
        data:  { isActive: false },
      })
      return NextResponse.json({
        deactivated: true,
        coupon: updated,
        message: `This coupon was used on ${ordersUsingIt} order${ordersUsingIt === 1 ? '' : 's'}, so it was deactivated instead of deleted. Customers can no longer use it.`,
      })
    }

    await prisma.coupon.delete({ where: { id } })
    return NextResponse.json({
      deleted: true,
      message: 'Coupon deleted.',
    })
  } catch (err) {
    if (err.statusCode) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    throw err
  }
})
