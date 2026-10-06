import { prisma } from './prisma'
import { getRazorpay } from './razorpay'
import { createCheckoutService } from './checkout-service'

export const checkouts = createCheckoutService({ db: prisma, gateway: getRazorpay })
