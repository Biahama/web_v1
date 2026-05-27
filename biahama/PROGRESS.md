# Biahama — Build Progress

## Build Phase Status

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 0 | Project setup, deps, Prisma schema | COMPLETE |
| Phase 1 | Push schema to Supabase DB | COMPLETE |
| Phase 2 | NextAuth (email + Google OAuth) | COMPLETE |
| Phase 3 | Product APIs + Homepage + Shop + Category pages | COMPLETE |
| Phase 4 | Cart (hybrid guest+DB) + Cart+Address page | COMPLETE |
| Phase 5 | Razorpay payment + order creation + webhook | COMPLETE |
| Phase 6 | Shiprocket integration, order tracking | NOT STARTED |
| Phase 7 | Brevo transactional emails | NOT STARTED |
| Phase 8 | Reviews, coupons, Notify Me, SEO, Clarity, mobile polish | PARTIALLY COMPLETE |
| Phase 9 | Deploy to Vercel | NOT STARTED |

---

## All Created Files

### App Router Pages

```
app/layout.tsx                          — Root layout: Cormorant Garamond + Jost fonts, Providers wrapper
app/globals.css                         — Design tokens (CSS vars), font classes, base styles
app/(auth)/login/page.jsx               — Two-step login (email → password), Google OAuth, COS.com two-column layout
app/(auth)/signup/page.jsx              — Signup form with name/email/password
app/(main)/layout.jsx                   — Main layout: AnnouncementBar + Navbar + Footer
app/(main)/page.jsx                     — Homepage: Campaign hero overlay, clamp padding-left text alignment
app/(main)/shop/page.jsx                — Shop page: category subheader bar + asymmetric layouts (10+1, 3+1, 3+0)
app/(main)/shop/[category]/page.jsx     — Category page: redirects singular/plural/dropdown categories to shop page
app/(main)/products/[slug]/page.jsx     — PDP: Server-side mock generator fallback, fetches prisma or serves mock PDP details
app/(main)/cart/page.jsx                — Cart+Address page: qty controls, saved addresses, pincode autocomplete, order summary
app/(main)/checkout/page.jsx            — Payment page: Razorpay popup + COD option, reads from sessionStorage
app/(main)/orders/[id]/page.jsx         — Order confirmation + tracking: status, items, totals, shipping address
```

### API Routes

```
app/api/auth/[...nextauth]/route.js     — NextAuth handler
app/api/auth/signup/route.js            — POST: create user with bcrypt password hash
app/api/products/route.js               — GET: list products with category filter + primary image + price range
app/api/products/[slug]/route.js        — GET: single product with variants, images, reviews
app/api/cart/route.js                   — GET/POST/DELETE: DB cart for logged-in users (session-protected)
app/api/addresses/route.js              — GET/POST: addresses with Zod validation
app/api/addresses/[id]/route.js         — PATCH/DELETE: individual address
app/api/orders/route.js                 — GET: user's order history
app/api/orders/[id]/route.js            — GET: single order detail (verified to belong to session user)
app/api/payments/create-order/route.js  — POST: creates Razorpay order, returns orderId/amount/keyId/prefill
app/api/payments/verify/route.js        — POST: HMAC verification, atomic Prisma transaction (stock+order+clear cart)
app/api/webhooks/razorpay/route.js      — POST: handles payment.captured / payment.failed events
```

### Components

```
components/providers.jsx                — Wraps SessionProvider + CartProvider
components/layout/AnnouncementBar.jsx   — Black top bar, promotional text (hidden on homepage)
components/layout/Navbar.jsx            — Three-section nav: Left (Home/Collection/Contact), Center (Logo), Right (utilities) + Hover dropdown (5 categories)
components/layout/Footer.jsx            — Brand tagline + 3 columns (Company, Help, Follow)
components/product/CategoryTabs.jsx     — Tab bar: (Deprecated, direct inline subheader used instead)
components/product/ProductGrid.jsx      — Category grids: Kurta/Pant (10+1 split layout), Shirts (3+1 layout), Tunics (3+0 layout)
components/product/ProductDetailClient.jsx — PDP details panel (sticky right, S-3XL pills, view details scroll, Razorpay checkout)
components/ui/ProductCard.jsx           — Product card with 4:5 image, name, price, wardrobe hover button, cart bag button
components/ui/CartDrawer.jsx            — Slide-from-right cart drawer (wired to navbar)
components/ui/SearchOverlay.jsx         — Full-screen search with Fuse.js autocomplete
```

### Library / Config

```
lib/prisma.js                           — Prisma singleton with @prisma/adapter-pg Driver Adapter (Prisma 7)
lib/auth.js                             — NextAuth authOptions: Credentials + Google, JWT strategy
lib/cart.js                             — Hybrid cart: localStorage (guest) + DB (logged-in), merge on login
lib/razorpay.js                         — Lazy-initialized Razorpay client via getRazorpay()
lib/brevo.js                            — Brevo (@getbrevo/brevo) email client setup
lib/cloudinary.js                       — Cloudinary config
lib/shiprocket.js                       — Shiprocket API helpers (token fetch, shipment creation)
lib/fuse.js                             — Fuse.js search config (keys: name, description, category; threshold: 0.3)
prisma/schema.prisma                    — 13 models: User, Address, Product, ProductVariant, ProductImage,
                                          Cart, Order, OrderItem, Coupon, Waitlist, Review, AbandonedCart
prisma.config.ts                        — Prisma 7 config with defineConfig, loads .env.local via dotenv
proxy.js                                — Next.js 16 middleware (named export 'proxy', uses next-auth withAuth)
```

---

## What Is Working

- **Build**: `npm run build` passes clean — all routes compile successfully
- **Database**: Supabase PostgreSQL connection scaffolding, 13 tables defined
- **Auth**: NextAuth email/password + Google OAuth, JWT strategy, signup + login pages
- **Products API**: GET with category filter, single product with variants/images/reviews
- **Cart**: Hybrid guest (localStorage) + DB (logged-in), merge on login, wired to navbar CartDrawer
- **Addresses**: CRUD with Zod validation, India Post pincode autocomplete (city+state auto-fill)
- **Cart+Address page**: Full two-column page, GST 5%, free shipping ≥ ₹3000, order summary
- **Payment flow**: Razorpay order creation → popup → HMAC verify → atomic transaction
- **COD**: Cash on delivery supported in verify endpoint
- **Order creation**: Atomic Prisma transaction: decrement stock + create Order + OrderItems + clear cart
- **Order confirmation page**: Status, items, totals, shipping address, tracking stub
- **Webhook**: Razorpay payment.captured / payment.failed handled
- **Brunello Cucinelli Styling Overhaul**: Pure white backdrop (`#ffffff`), soft charcoal text (`#262626`), thin borders (`#e5e5e5`), Google Fonts (Cormorant Garamond + Jost).
- **Homepage Campaign Overlay**: 100vh full-screen background overlaying aligned middle-left caption text and `STEP INSIDE →` button.
- **Navbar Dropdown**: Hovering over `Collection` triggers a floating menu with 5 side-by-side side cards (Dresses, Shirts, Trousers, Tunics, Sets) loading Unsplash assets.
- **Collections Grid Layouts**: `#f5f4f4` subheader bar for `KURTA`, `SHIRTS`, `TUNICS`, `PANT`.
  - Kurta / Pant: 10+1 split layout (2x2 grid left, campaign banner right stretching to match 2x2 grid height, 6 products below).
  - Shirts: 3+1 layout (landscape banner top, all products rendered below).
  - Tunics: 3+0 layout (3 products side-by-side, no banner).
- **Navbar Category Redirects**: Dynamic routing maps dropdown categories `dresses` and `sets` cleanly to `kurtas` on the shop page, aligning URL parameters with the active subheader tab.
- **Product Detail Page (PDP)**: Zero-gap vertical stack of 6 product images (left), sticky right-side details panel, round size selection pills (S-3XL) with validation alerts, `+ VIEW DETAILS` scrolling to bottom description accordions, Razorpay wallet checkouts, and shipping details display.
- **Resilient PDP Server-Side Mock Fallback**: PDP routes automatically intercept mock slugs (e.g. `mock-kurtas-1`) or database errors to construct complete product objects (images, price ranges, organic linen care details, and size variants) on the server, ensuring full visual and checkout flow testing when DB is empty/offline.

## What Still Needs Work / TODOs

### Phase 6 — Shiprocket (NOT STARTED)
- `POST /api/webhooks/shiprocket` — handle tracking status updates
- On order confirmed → auto-create Shiprocket shipment, save AWB number
- Update `shippingStatus` in DB on each webhook event
- Fire customer email on: picked_up, out_for_delivery, delivered, failed_delivery

### Phase 7 — Brevo Emails (NOT STARTED)
- Order confirmation email (on order placed)
- Order shipped email (tracking link)
- Order delivered email (+ review request)
- Abandoned cart emails (2hr + 24hr)
- Item restocked email (waitlist)
- Refund confirmation email
- `lib/brevo.js` scaffolded but email sending functions not implemented

### Phase 8 — Features (PARTIALLY COMPLETE)
- Product detail page (`/products/[slug]`) — Page 4 in CLAUDE.md spec (COMPLETE)
- Account dashboard (`/account/page.jsx`)
- Order history page (`/account/orders/page.jsx`)
- Wardrobe/wishlist (`/account/wardrobe/page.jsx`)
- Reviews — submit + display
- Coupons — apply at cart, validate at order creation
- Notify Me (waitlist) — subscribe + trigger on restock
- SEO metadata on product pages
- Microsoft Clarity script
- Mobile polish (responsive breakpoints on all pages)
- "Only X left" badge when stockQty ≤ 3
- "Sold Out" + disabled Add to Cart when stockQty === 0
- Search overlay with Fuse.js fully wired to product data

### Phase 9 — Deploy (NOT STARTED)
- Vercel deployment
- Domain connection
- Production env vars

---

## Key Architectural Decisions

### Prisma 7 Breaking Changes (Critical)
- `url` field removed from `datasource` block in schema — use `prisma.config.ts` with `defineConfig`
- `datasourceUrl` removed from PrismaClient constructor — use `@prisma/adapter-pg` Driver Adapter
- `env()` in schema throws if var unset — use `process.env` in `prisma.config.ts` instead
- File: `lib/prisma.js` uses `PrismaPg` adapter from `@prisma/adapter-pg`

### Next.js 16 Breaking Changes (Critical)
- `middleware.js` renamed to `proxy.js` with named export `proxy`
- Route handlers: same API as Next.js 14

### Prices: Always in Paise
- All prices stored and calculated in paise (₹1 = 100 paise)
- Display only: `(paise / 100).toLocaleString('en-IN')`
- SHIPPING_THRESHOLD = 300000 (₹3000), SHIPPING_COST = 9900 (₹99)
- GST_RATE = 0.05 (5%)

### Razorpay: Lazy Initialization
- `lib/razorpay.js` exports `getRazorpay()` (lazy singleton)
- DO NOT use `export const razorpay = new Razorpay(...)` at module level — throws at build time if key is empty

### Payment Flow
1. Cart page → `POST /api/payments/create-order` with `{ addressId }`
2. Response `{ orderId, amount, currency, keyId, prefill, addressId }` stored in `sessionStorage('biahama_checkout')`
3. Redirect to `/checkout`
4. Checkout reads sessionStorage, opens Razorpay popup
5. On success → `POST /api/payments/verify` with HMAC data
6. Verify: HMAC check → atomic transaction → return `{ orderId }` (internal DB id)
7. Clear sessionStorage, clear cart, redirect to `/orders/{orderId}`

### Cart State Management
- `lib/cart.js` — React Context with `CartProvider`
- Guest: localStorage key `biahama_cart`
- Logged in: DB via `/api/cart`, synced on every add/remove/update
- Merge on login: guest cart items not in DB cart get POST'd to DB, then localStorage cleared

### Route Groups
- `(auth)` group: login + signup pages — NO Navbar/Footer
- `(main)` group: all shop pages — WITH AnnouncementBar + Navbar + Footer
- `(main)/layout.jsx` renders the shared layout

### Supabase Connection
- Use Session pooler URL: `aws-1-ap-south-1.pooler.supabase.com:5432`
- Direct connection (port 5432 on db.*.supabase.co) is blocked by Supabase free tier
- Full URL format: `postgresql://postgres.{ref}:{password}@aws-1-ap-south-1.pooler.supabase.com:5432/postgres`

### Brevo Package
- Use `@getbrevo/brevo` (NOT `@sib-api-v3-sdk/node-api-client` — that package doesn't exist)
