// ============================================================
// ADMIN API: list all coupons / create a new coupon
// ============================================================
// The admin panel at /admin/coupons talks to this file.
//
//   GET  /api/admin/coupons  -> every coupon (newest first)
//   POST /api/admin/coupons  -> create a coupon
//
// SECURITY: only admins (emails in ADMIN_EMAILS) may use this.
// MONEY: stored in PAISE (₹500 = 50000). The admin form shows
// rupees and converts before sending. A "percent" coupon's value
// is just the percent number (10 = 10% off).
// ============================================================

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'
import { withErrorLogging } from '@/lib/logger'

// ------------------------------------------------------------
// What a valid "create coupon" request must look like.
// ------------------------------------------------------------
const couponSchema = z.object({
  code:          z.string().min(3, 'The code must be at least 3 characters'),
  type:          z.enum(['percent', 'flat']),
  // percent: the percent number (10 = 10% off)
  // flat:    amount off in PAISE (the form converts from rupees)
  value:         z.number().int().positive('The discount value must be a positive number'),
  minOrderValue: z.number().int().positive().optional().nullable(), // paise
  maxDiscount:   z.number().int().positive().optional().nullable(), // paise
  usageLimit:    z.number().int().positive().optional().nullable(),
  validFrom:     z.string().min(1, 'A start date is required'),
  validUntil:    z.string().min(1, 'An end date is required'),
  isActive:      z.boolean().default(true),
})

// Turn the two date strings into real dates. The coupon works for
// the WHOLE end day (until 23:59:59), which is what people expect
// when they pick "valid until 31 Dec".
function parseDates(validFrom, validUntil) {
  const from = new Date(validFrom)
  const until = new Date(validUntil)
  if (isNaN(from) || isNaN(until)) return { error: 'Please pick valid dates' }
  until.setHours(23, 59, 59, 999)
  if (until < from) return { error: 'The end date must be after the start date' }
  return { from, until }
}

// ------------------------------------------------------------
// GET — list every coupon, newest first (usedCount included).
// ------------------------------------------------------------
export const GET = withErrorLogging('api/admin/coupons GET', async () => {
  try {
    await requireAdmin()

    const coupons = await prisma.coupon.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ coupons })
  } catch (err) {
    // Errors we raised on purpose carry a status code (403 = not admin).
    if (err.statusCode) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    throw err // anything unexpected -> logged by withErrorLogging
  }
})

// ------------------------------------------------------------
// POST — create a new coupon.
// ------------------------------------------------------------
export const POST = withErrorLogging('api/admin/coupons POST', async (req) => {
  try {
    await requireAdmin()

    // Never trust the browser: validate everything.
    const parsed = couponSchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }
    const data = parsed.data

    // A percent bigger than 100 makes no sense.
    if (data.type === 'percent' && data.value > 100) {
      return NextResponse.json(
        { error: 'A percent discount cannot be more than 100' },
        { status: 400 }
      )
    }

    const dates = parseDates(data.validFrom, data.validUntil)
    if (dates.error) {
      return NextResponse.json({ error: dates.error }, { status: 400 })
    }

    const coupon = await prisma.coupon.create({
      data: {
        // Codes are always stored UPPERCASE so "save10" and "SAVE10"
        // are the same coupon.
        code:          data.code.trim().toUpperCase(),
        type:          data.type,
        value:         data.value,
        minOrderValue: data.minOrderValue ?? null,
        maxDiscount:   data.maxDiscount ?? null,
        usageLimit:    data.usageLimit ?? null,
        validFrom:     dates.from,
        validUntil:    dates.until,
        isActive:      data.isActive,
      },
    })

    return NextResponse.json({ coupon }, { status: 201 })
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
