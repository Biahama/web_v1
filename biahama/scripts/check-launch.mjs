import { config } from 'dotenv'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { missingEnvironment } from '../lib/readiness.js'

const envArg = process.argv.indexOf('--env')
config({ path: envArg >= 0 ? process.argv[envArg + 1] : '.env.local', quiet: true })
let failed = false
for (const key of missingEnvironment(process.env)) { console.error(`Missing: ${key}`); failed = true }
if (process.env.RAZORPAY_KEY_ID && !process.env.RAZORPAY_KEY_ID.startsWith('rzp_live_')) { console.error('Payments use a test key; production requires live mode.'); failed = true }
if (process.env.CRON_SECRET && process.env.CRON_SECRET.length < 32) { console.error('CRON_SECRET needs at least 32 random characters.'); failed = true }
for (const key of ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET']) if (!process.env[key]) { console.error(`Missing product-upload configuration: ${key}`); failed = true }
if (!process.env.SHIPROCKET_EMAIL || !process.env.SHIPROCKET_PASSWORD) console.log('Shiprocket is not configured. Use manual fulfilment and enter tracking in Admin → Orders.')
if (process.argv.includes('--database') && process.env.DATABASE_URL) {
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL, max: 1, connectionTimeoutMillis: 10000 }) })
  try {
    await Promise.all([db.checkout.count(), db.checkoutItem.count(), db.orderTask.count(), db.returnRequest.count(), db.wardrobeItem.count(), db.loyaltyTransaction.count(), db.analyticsEvent.count(), db.order.findFirst({ select: { srOrderId: true, srShipmentId: true, deliveredAt: true } })])
    const tables = await db.$queryRaw`SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public'`
    const storeTables = ['User', 'Address', 'Cart', 'Order', 'OrderItem', 'Coupon', 'Waitlist', 'Review', 'AbandonedCart', 'ErrorLog', 'LoyaltyTransaction', 'AnalyticsEvent', 'WardrobeItem', 'Checkout', 'CheckoutItem', 'OrderTask', 'ReturnRequest', 'Product', 'ProductImage', 'ProductVariant', 'ContentPage', 'SiteSetting']
    const unsecured = storeTables.filter(name => !tables.some(table => table.tablename === name && table.rowsecurity))
    if (unsecured.length) { console.error(`Row security is missing: ${unsecured.join(', ')}`); failed = true }
    const roles = await db.$queryRaw`SELECT rolbypassrls FROM pg_roles WHERE rolname = current_user`
    if (!roles[0]?.rolbypassrls) { console.error('The server database role must bypass row security for the storefront APIs.'); failed = true }
    console.log('Required checkout, account, analytics and shipping schema is accessible.')
  } catch { console.error('Database readiness failed. Check connection access and apply the checkout and customer-service SQL rollouts before deployment.'); failed = true }
  finally { await db.$disconnect() }
}
console.log('Also verify Razorpay automatic capture/webhook delivery, the five-minute recovery schedule, Brevo sender verification, and Supabase redirect URLs in the provider dashboards.')
process.exitCode = failed ? 1 : 0
