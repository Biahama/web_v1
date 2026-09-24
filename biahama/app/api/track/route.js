// ============================================================
// ANALYTICS BEACON — tiny public endpoint the storefront pings
// (page views, add-to-carts...). No personal data is stored:
// just an anonymous random session key.
// It must NEVER slow down or break the shop, so it always
// answers "ok" — even if saving the event failed.
// ============================================================

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

const schema = z.object({
  type: z.enum(['page_view', 'add_to_cart', 'wardrobe_save', 'begin_checkout', 'coupon_applied']),
  path: z.string().max(300).optional(),
  productId: z.string().max(100).optional(),
  sessionKey: z.string().max(100).optional(),
})

export async function POST(req) {
  try {
    const parsed = schema.safeParse(await req.json())
    if (parsed.success) {
      await prisma.analyticsEvent.create({ data: parsed.data })
    }
  } catch (error) {
    // Analytics is best-effort — never let it error loudly.
    console.error('[track] could not record event:', error.message)
  }
  return NextResponse.json({ ok: true })
}
