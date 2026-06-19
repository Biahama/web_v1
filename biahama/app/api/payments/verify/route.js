import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import crypto from 'crypto'

import { prisma } from '@/lib/prisma'

const SHIPPING_THRESHOLD = 300000
const SHIPPING_COST      = 9900
const GST_RATE           = 0.05

export async function POST(req) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, addressId, paymentMethod } = await req.json()

  if (paymentMethod !== 'cod') {
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex')

    if (expectedSignature !== razorpay_signature) {
      return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 })
    }
  }

  const address = await prisma.address.findFirst({
    where: { id: addressId, userId: user.id },
  })
  if (!address) return NextResponse.json({ error: 'Address not found' }, { status: 404 })

  const cartItems = await prisma.cart.findMany({
    where: { userId: user.id },
    include: {
      variant: {
        include: { product: { select: { id: true, name: true, slug: true } } },
      },
    },
  })

  if (cartItems.length === 0) return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })

  const subtotal = cartItems.reduce((s, i) => s + i.variant.price * i.quantity, 0)
  const shipping  = subtotal >= SHIPPING_THRESHOLD ? 0 : SHIPPING_COST
  const gst       = Math.round(subtotal * GST_RATE)
  const total     = subtotal + shipping + gst

  const shippingAddress = {
    fullName: address.fullName,
    phone:    address.phone,
    line1:    address.line1,
    line2:    address.line2 || null,
    pincode:  address.pincode,
    city:     address.city,
    state:    address.state,
  }

  const order = await prisma.$transaction(async (tx) => {
    for (const item of cartItems) {
      const variant = await tx.productVariant.findUnique({ where: { id: item.variantId } })
      if (!variant || variant.stockQty < item.quantity) {
        throw new Error(`Insufficient stock for ${item.variant.product.name}`)
      }
      await tx.productVariant.update({
        where: { id: item.variantId },
        data:  { stockQty: { decrement: item.quantity } },
      })
    }

    const newOrder = await tx.order.create({
      data: {
        userId:          user.id,
        status:          paymentMethod === 'cod' ? 'confirmed' : 'confirmed',
        totalAmount:     total,
        shippingAmount:  shipping,
        paymentMethod:   paymentMethod || 'razorpay',
        paymentId:       razorpay_payment_id || null,
        paymentStatus:   paymentMethod === 'cod' ? 'pending' : 'paid',
        shippingAddress: shippingAddress,
        items: {
          create: cartItems.map(item => ({
            productId:       item.variant.product.id,
            variantId:       item.variantId,
            productName:     item.variant.product.name,
            variantDetails:  { size: item.variant.size, color: item.variant.color, sku: item.variant.sku },
            quantity:        item.quantity,
            priceAtPurchase: item.variant.price,
            total:           item.variant.price * item.quantity,
          })),
        },
      },
    })

    await tx.cart.deleteMany({ where: { userId: user.id } })

    return newOrder
  })

  return NextResponse.json({ orderId: order.id })
}
