# Biahama — Project Status

Last updated: 11 July 2026

## What the site is built with

- **Next.js 16** — the framework that runs the website (pages, checkout, everything).
- **Supabase Auth** — handles customer sign-up and login.
- **Prisma + Supabase Postgres** — the database (products, orders, carts, addresses).
- **Razorpay** — takes payments (cards, UPI, wallets) and confirms them securely.
- **Cloudinary** — hosts all product photos.
- **Microsoft Clarity** — records anonymous visitor behaviour for analytics.

## What works today

- Homepage, shop page, and category pages (Kurtas, Shirts, Tunics, Pants).
- Product detail pages with size selection.
- Cart: works for guests (saved in the browser) and logged-in customers (saved in the database), and merges the two on login.
- Customer accounts: sign-up, login, saved addresses with pincode autocomplete.
- Checkout: Razorpay payment popup plus Cash on Delivery.
- Orders: created safely in one step (stock reduced, order saved, cart cleared), with an order confirmation page.
- Razorpay webhook: payment confirmations from Razorpay are verified before an order is trusted.
- Error logging: every error on the site is recorded in the database (see below).

## Not built yet

- **Shiprocket shipping** — no courier integration; orders are not automatically shipped or tracked.
- **Brevo emails** — no order confirmation / shipping emails are sent to customers yet.
- **Admin panel** — no back-office screen; products and orders are managed directly in Supabase for now.
- **Deployment** — the site runs locally only; it has not been published to the internet (Vercel) yet.
- Smaller items: reviews, coupons, "notify me" waitlist, account dashboard pages.

## When something breaks

Every error on the site is automatically saved with a timestamp in the
**ErrorLog** table in the database. To look at it:

1. Open your Supabase project in the browser.
2. Go to **Table Editor** in the left sidebar.
3. Click the **ErrorLog** table.
4. Sort by the **createdAt** column (newest first) to see the latest errors.

The **source** column tells you which part of the site broke (for example
"api/cart" means the cart, "api/payments/verify" means payment confirmation).
The **message** column describes what went wrong. Share a screenshot of the
row with whoever is helping you fix it.

## Where things live (for developers)

- Pages: `app/(main)/` (shop) and `app/(auth)/` (login/register).
- API routes: `app/api/`.
- Shared code: `lib/` (cart, pricing, orders, Razorpay, error logger).
- Database schema: `prisma/schema.prisma`.
- Environment variables: copy `.env.example` to `.env.local` and fill it in.
