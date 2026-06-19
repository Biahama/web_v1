import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

import { prisma } from '@/lib/prisma'
import { getRazorpay } from '@/lib/razorpay'

const SHIPPING_THRESHOLD = 300000
const SHIPPING_COST      = 9900
const GST_RATE           = 0.05

export async function POST(req) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { addressId } = await req.json()
  if (!addressId) return NextResponse.json({ error: 'Address required' }, { status: 400 })

  const address = await prisma.address.findFirst({
    where: { id: addressId, userId: user.id },
  })
  if (!address) return NextResponse.json({ error: 'Address not found' }, { status: 404 })

  const cartItems = await prisma.cart.findMany({
    where: { userId: user.id },
    include: {
      variant: {
        include: { product: { select: { name: true, slug: true, category: true } } },
      },
    },
  })

  if (cartItems.length === 0) return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })

  const subtotal = cartItems.reduce((s, i) => s + i.variant.price * i.quantity, 0)
  const shipping  = subtotal >= SHIPPING_THRESHOLD ? 0 : SHIPPING_COST
  const gst       = Math.round(subtotal * GST_RATE)
  const total     = subtotal + shipping + gst

  const rzpOrder = await getRazorpay().orders.create({
    amount:   total,
    currency: 'INR',
    notes: {
      userId:    user.id,
      addressId: address.id,
    },
  })

  return NextResponse.json({
    orderId:   rzpOrder.id,
    amount:    total,
    currency:  'INR',
    keyId:     process.env.RAZORPAY_KEY_ID,
    prefill: {
      name:    session.user.name || address.fullName,
      email:   session.user.email,
      contact: address.phone,
    },
  })
}
