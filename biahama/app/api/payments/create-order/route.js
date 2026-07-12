// ============================================================
// STEP 1 OF ONLINE PAYMENT: create a Razorpay order
// ============================================================
// The browser calls this before opening the Razorpay popup.
// We recompute the cart total ON THE SERVER (never trust the
// browser's numbers) and tell Razorpay how much to charge.
// ============================================================

import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { z } from 'zod'

import { prisma } from '@/lib/prisma'
import { getRazorpay } from '@/lib/razorpay'
import { computeTotals } from '@/lib/pricing'
import { ensureUser } from '@/lib/ensure-user'
import { withErrorLogging } from '@/lib/logger'

// What a valid request body must look like.
const bodySchema = z.object({
  addressId: z.string().min(1, 'Address is required'),
})

export const POST = withErrorLogging('api/payments/create-order', async (req) => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Validate the request body — reject bad input with a clear message
  // instead of crashing later.
  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }
  const { addressId } = parsed.data

  // Make sure this user exists in OUR User table
  // (prevents "foreign key" database errors for new customers).
  await ensureUser(user)

  // The address must belong to this user.
  const address = await prisma.address.findFirst({
    where: { id: addressId, userId: user.id },
  })
  if (!address) return NextResponse.json({ error: 'Address not found' }, { status: 404 })

  const cartItems = await prisma.cart.findMany({
    where: { userId: user.id },
    include: { variant: true },
  })
  if (cartItems.length === 0) return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })

  // One source of truth for pricing. Prices are GST-inclusive,
  // so the total is simply subtotal + shipping (no GST added on top).
  const { total } = computeTotals(cartItems)

  // We store userId and addressId in the Razorpay "notes" so the
  // webhook can still create the order if the customer pays but
  // closes the browser before we hear back.
  const rzpOrder = await getRazorpay().orders.create({
    amount:   total,
    currency: 'INR',
    notes: {
      userId:    user.id,
      addressId: address.id,
    },
  })

  // Name/email come from the logged-in Supabase user.
  // (The old code referenced a "session" object that no longer
  // exists, which crashed every online payment.)
  const meta = user.user_metadata ?? {}
  const displayName =
    [meta.first_name, meta.last_name].filter(Boolean).join(' ') ||
    meta.full_name ||
    meta.name ||
    address.fullName

  return NextResponse.json({
    orderId:  rzpOrder.id,
    amount:   total,
    currency: 'INR',
    keyId:    process.env.RAZORPAY_KEY_ID,
    prefill: {
      name:    displayName,
      email:   user.email,
      contact: address.phone,
    },
  })
})
