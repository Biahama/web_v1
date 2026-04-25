# Biahama — Claude Code Instructions

## What is Biahama?
Luxury linen clothing brand based in India. The website is a full e-commerce store — browse, buy, track. Think COS.com in feel — minimal, architectural, intentional. White background, black text, clean typography.

---

## Tech Stack — Do Not Deviate

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Frontend | React + Tailwind CSS |
| Animations | Framer Motion |
| Backend | Next.js API Routes |
| Database | PostgreSQL via Supabase |
| ORM | Prisma |
| Auth | NextAuth.js |
| Payments | Razorpay |
| Shipping | Shiprocket API |
| Images | Cloudinary |
| Email | Brevo (transactional) |
| Search | Fuse.js (client-side fuzzy search) |
| Hosting | Vercel |
| Analytics | Microsoft Clarity |

---

## Fonts
- **Headings / Display** — Cormorant Garamond (Google Fonts) — serif, light weight (300), often italic
- **Body / UI** — Jost (Google Fonts) — sans-serif, light (300) to medium (500)

---

## Design Tokens

```css
--white:  #ffffff
--bg:     #f0ede8   /* warm off-white, used as page background */
--black:  #1a1814   /* near-black, not pure black */
--gray:   #8a8480
--border: #ddd9d3
--light:  #e8e4de
```

Always use these tokens. Never hardcode hex values directly in components.

---

## Folder Structure

```
/app
  /page.jsx                    ← Homepage (Page 1)
  /shop
    /page.jsx                  ← All categories (Page 2)
  /shop/[category]
    /page.jsx                  ← Category listing (Page 3)
  /products/[slug]
    /page.jsx                  ← Product detail (Page 4)
  /cart
    /page.jsx                  ← Cart + Address (Page 5)
  /checkout
    /page.jsx                  ← Payment (Page 6)
  /orders
    /[id]/page.jsx             ← Order confirmation + tracking
  /account
    /page.jsx                  ← Account dashboard
    /orders/page.jsx           ← Order history
    /wardrobe/page.jsx         ← Saved items (wishlist)
  /api
    /auth/[...nextauth]/route.js
    /products/route.js
    /products/[slug]/route.js
    /cart/route.js
    /orders/route.js
    /payments/create-order/route.js
    /payments/verify/route.js
    /webhooks/razorpay/route.js
    /webhooks/shiprocket/route.js
    /waitlist/route.js
    /search/route.js
/components
  /layout
    Navbar.jsx
    Footer.jsx
    AnnouncementBar.jsx
  /ui
    Button.jsx
    ProductCard.jsx
    SwatchPicker.jsx
    SizeSelector.jsx
    CartDrawer.jsx
    SearchOverlay.jsx
    WardrobeButton.jsx
  /product
    ProductGrid.jsx
    ProductImages.jsx
    ProductInfo.jsx
    CategoryTabs.jsx
/lib
  /prisma.js                   ← Prisma client singleton
  /cloudinary.js
  /razorpay.js
  /shiprocket.js
  /brevo.js
  /fuse.js                     ← Fuse.js search setup
/prisma
  schema.prisma
```

---

## Navbar — Locked Design

**Right side only:** `🔍 SHOP  🧥 WARDROBE  🛍`
**Center:** `BIAHAMA` (Cormorant Garamond, letter-spacing: 0.3em)
**Left side:** nothing
- Search icon opens full-screen overlay with Fuse.js autocomplete
- Wardrobe = wishlist (saved items)
- Cart icon shows item count badge
- Fixed position, white/bg background, 1px border-bottom

---

## Pages — Locked Designs

### Page 1 — Homepage
- Announcement bar (black, top)
- Navbar
- Stacked section blocks — each block = one-liner text row + full-width campaign image
- One-liner: italic serif category name left + small descriptor + arrow right
- Clicking one-liner OR image → navigates to Page 3 (category page)
- Footer: brand tagline + 3 columns (Company, Help, Follow)

### Page 2 — Shop (All Categories)
- Large italic serif title that updates per active tab ("Categories" by default)
- Filter tabs: ALL · TUNICS · SHIRTS · KURTAS · DRESSES · SETS · TROUSERS · JACKETS · WRAPS
- Active tab underlined
- 2-column product grid, scrolls vertically
- Clicking a product → Page 3 with `?cat=kurta&pid=5` (clicked product appears first)

### Page 3 — Category Landing
- Breadcrumb: Home · Shop · [Category]
- Full-width campaign hero image (90vh) with category name overlaid in large italic type
- Category tabs below hero (same as Page 2, active tab highlighted)
- Clicked product pinned to slot 1 with "Selected" badge + black outline
- All other products in category follow in 2-col grid
- Wardrobe (hanger) button appears on card hover

### Page 4 — Product Detail (build next)
- Large product images left (switchable)
- Product info right: name, price, color swatches, size selector, add to cart
- Size guide link
- Care instructions accordion
- "You may also like" row at bottom

### Page 5 — Cart + Address
- Two column on desktop, single scroll on mobile
- Left: cart items with qty controls + remove
- Right: saved addresses (one-tap select) + inline new address form
- Pincode auto-fills city + state (India Post API)
- Order summary: subtotal, shipping, total
- "Proceed to Pay" button — sends cart + address in ONE API call

### Page 6 — Payment
- Razorpay popup (handled by Razorpay SDK)
- COD option available
- On success → webhook verifies → order created → confirmation page

---

## Database Schema — Full Prisma Schema

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String    @id @default(uuid())
  name          String?
  email         String    @unique
  phone         String?
  passwordHash  String?
  provider      String    @default("email")
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  addresses     Address[]
  cart          Cart[]
  orders        Order[]
  reviews       Review[]
  waitlist      Waitlist[]
  abandonedCarts AbandonedCart[]
}

model Address {
  id          String   @id @default(uuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  fullName    String
  phone       String
  line1       String
  line2       String?
  pincode     String
  city        String
  state       String
  isDefault   Boolean  @default(false)
  createdAt   DateTime @default(now())
}

model Product {
  id              String           @id @default(uuid())
  name            String
  slug            String           @unique
  description     String?
  category        String
  fabric          String?
  care            String?
  isActive        Boolean          @default(true)
  metaTitle       String?
  metaDescription String?
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt
  variants        ProductVariant[]
  images          ProductImage[]
  reviews         Review[]
}

model ProductVariant {
  id           String         @id @default(uuid())
  productId    String
  product      Product        @relation(fields: [productId], references: [id])
  size         String
  color        String
  colorHex     String?
  stockQty     Int            @default(0)
  sku          String         @unique
  price        Int            // stored in paise
  comparePrice Int?           // original price if on sale
  createdAt    DateTime       @default(now())
  images       ProductImage[]
  cartItems    Cart[]
  orderItems   OrderItem[]
  waitlist     Waitlist[]
}

model ProductImage {
  id        String          @id @default(uuid())
  productId String
  product   Product         @relation(fields: [productId], references: [id])
  variantId String?
  variant   ProductVariant? @relation(fields: [variantId], references: [id])
  url       String
  altText   String?
  sortOrder Int             @default(0)
  isPrimary Boolean         @default(false)
}

model Cart {
  id        String         @id @default(uuid())
  userId    String?
  user      User?          @relation(fields: [userId], references: [id])
  sessionId String?
  variantId String
  variant   ProductVariant @relation(fields: [variantId], references: [id])
  quantity  Int
  createdAt DateTime       @default(now())
  updatedAt DateTime       @updatedAt
}

model Order {
  id              String      @id @default(uuid())
  userId          String
  user            User        @relation(fields: [userId], references: [id])
  status          String      @default("pending")
  totalAmount     Int
  discountAmount  Int         @default(0)
  shippingAmount  Int         @default(0)
  paymentMethod   String
  paymentId       String?
  paymentStatus   String      @default("pending")
  shippingAddress Json
  couponCode      String?
  shippingPartner String?
  awbNumber       String?
  shippingStatus  String      @default("not_shipped")
  codAmount       Int?
  remittanceId    String?
  notes           String?
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
  items           OrderItem[]
}

model OrderItem {
  id               String         @id @default(uuid())
  orderId          String
  order            Order          @relation(fields: [orderId], references: [id])
  productId        String
  variantId        String
  variant          ProductVariant @relation(fields: [variantId], references: [id])
  productName      String
  variantDetails   Json
  quantity         Int
  priceAtPurchase  Int
  total            Int
}

model Coupon {
  id            String    @id @default(uuid())
  code          String    @unique
  type          String    // "percentage" or "flat"
  value         Int
  minOrderValue Int?
  maxDiscount   Int?
  usageLimit    Int?
  usedCount     Int       @default(0)
  userSpecific  String?
  validFrom     DateTime
  validUntil    DateTime
  isActive      Boolean   @default(true)
  createdAt     DateTime  @default(now())
}

model Waitlist {
  id        String         @id @default(uuid())
  variantId String
  variant   ProductVariant @relation(fields: [variantId], references: [id])
  email     String
  userId    String?
  user      User?          @relation(fields: [userId], references: [id])
  notified  Boolean        @default(false)
  createdAt DateTime       @default(now())
}

model Review {
  id          String   @id @default(uuid())
  productId   String
  product     Product  @relation(fields: [productId], references: [id])
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  orderId     String
  rating      Int
  title       String?
  body        String?
  isVerified  Boolean  @default(false)
  isPublished Boolean  @default(false)
  createdAt   DateTime @default(now())
}

model AbandonedCart {
  id               String   @id @default(uuid())
  userId           String?
  user             User?    @relation(fields: [userId], references: [id])
  email            String
  cartSnapshot     Json
  firstEmailSent   Boolean  @default(false)
  secondEmailSent  Boolean  @default(false)
  recovered        Boolean  @default(false)
  createdAt        DateTime @default(now())
}
```

---

## Cart Logic — Hybrid

- **Guest** → cart stored in `localStorage` with `sessionId`
- **Logged in** → cart stored in DB against `userId`
- **On login** → merge `sessionId` cart into `userId` cart automatically
- Always sync to DB once logged in
- Never lose cart across devices for logged-in users

---

## Payment Flow — Razorpay

```
1. POST /api/payments/create-order → creates Razorpay order, returns order_id
2. Frontend opens Razorpay popup with order_id
3. User pays
4. Frontend sends { razorpay_order_id, razorpay_payment_id, razorpay_signature } to backend
5. POST /api/payments/verify → HMAC signature verification
6. If valid → atomic transaction:
   - decrement stock
   - create Order + OrderItems
   - clear cart
   - trigger confirmation email via Brevo
7. Redirect to order confirmation page
```

Always verify HMAC signature. Never trust frontend payment confirmation.

---

## Shipping — Shiprocket

- On order confirmed → POST to Shiprocket API to create shipment
- Save AWB number to order
- Shiprocket webhook → POST /api/webhooks/shiprocket
- Update `shippingStatus` in DB on each webhook event
- Fire customer email on: picked_up, out_for_delivery, delivered, failed_delivery

---

## Search — Fuse.js

```js
// lib/fuse.js
import Fuse from 'fuse.js'

export const fuseOptions = {
  keys: ['name', 'description', 'category'],
  threshold: 0.3,         // typo tolerance
  includeScore: true,
}
```

- Autocomplete dropdown shows: thumbnail + name + price
- Max 5 suggestions
- Debounce input by 300ms
- Full-screen search overlay, closes on Escape

---

## Email Triggers — Brevo

| Trigger | Template |
|---|---|
| Order placed | Order confirmation + summary |
| Order shipped | Tracking link |
| Order delivered | Delivery confirmation + review request |
| Abandoned cart (2hr) | "You left something behind" |
| Abandoned cart (24hr) | Second nudge + free shipping offer |
| Item restocked | Waitlist notification |
| Refund processed | Refund confirmation |

---

## Order Statuses

```
pending → confirmed → processing → shipped → delivered
                    → cancelled
                    → return_initiated → returned → refund_initiated → refunded
```

## Shipping Statuses

```
not_shipped → pickup_scheduled → picked_up → in_transit
→ out_for_delivery → delivered
→ failed_delivery → rto_initiated → rto_delivered
```

---

## SEO — Every Product Page

```jsx
export const metadata = {
  title: `${product.name} | Biahama`,
  description: product.metaDescription,
  openGraph: {
    images: [product.images[0].url],
  },
}
```

- Slugs as URLs: `/products/ivory-linen-kurta`
- Image alt text on every image
- Descriptive filenames on Cloudinary uploads

---

## Environment Variables

```env
# Database
DATABASE_URL=

# Auth
NEXTAUTH_SECRET=
NEXTAUTH_URL=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Cloudinary
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Razorpay
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=

# Shiprocket
SHIPROCKET_EMAIL=
SHIPROCKET_PASSWORD=

# Brevo
BREVO_API_KEY=

# Microsoft Clarity
NEXT_PUBLIC_CLARITY_PROJECT_ID=
```

---

## Key Rules — Always Follow

1. **Prices always in paise** — ₹4,500 = `450000`. Convert only for display.
2. **Snapshots on orders** — always save `priceAtPurchase`, `productName`, `variantDetails`, `shippingAddress` as JSON snapshots. Never reference live data.
3. **Atomic transactions** — payment verification + stock decrement + order creation in one Prisma `$transaction`. All or nothing.
4. **Never trust frontend** — always verify Razorpay HMAC on backend before creating any order.
5. **Passwords** — always hashed with bcrypt. Never stored plain.
6. **Images via Cloudinary** — never store images locally. Always upload to Cloudinary, store URL in DB.
7. **Cart merge on login** — always merge guest cart (sessionId) into user cart on login.
8. **Low stock threshold** — `stockQty <= 3` triggers "Only X left" UI.
9. **Notify Me** — when `stockQty` goes from 0 to > 0, query waitlist and fire emails.
10. **All API routes protected** — use NextAuth `getServerSession` to protect `/api/cart`, `/api/orders`, `/api/account/*`.

---

## Build Order — Follow This Sequence

```
Phase 0  → Project setup, env vars, Prisma schema, Supabase connection
Phase 1  → Push schema to DB, verify tables in Supabase
Phase 2  → NextAuth setup, sign up, login, Google OAuth, middleware
Phase 3  → Product APIs + Homepage + Shop + Category pages
Phase 4  → Cart (hybrid), Cart+Address page
Phase 5  → Razorpay integration, payment flow, order creation
Phase 6  → Shiprocket integration, order tracking
Phase 7  → Brevo emails, all triggers
Phase 8  → Reviews, coupons, Notify Me, SEO, Clarity, mobile polish
Phase 9  → Deploy to Vercel, connect domain, go live
```

Do not skip phases. Do not build Phase 4 before Phase 2 (auth) is working.

---

## UI Component Rules

- No page refreshes — use Next.js `<Link>` for navigation
- Loading states on every async action
- Error states on every form
- Toast notifications for: add to cart, save to wardrobe, coupon applied, errors
- Cart drawer on desktop (slides from right), cart page on mobile
- Address form expands inline — no modals, no new pages
- Pincode field auto-fills city + state using India Post API: `https://api.postalpincode.in/pincode/{pincode}`
- Color swatches: 14px circles with `border: 1px solid rgba(0,0,0,0.1)`
- "Only X left" badge when stockQty <= 3
- "Sold Out" + disabled Add to Cart when stockQty === 0
- Wardrobe (hanger) button appears on product card hover, top-right corner

---

## India-Specific Details

- Currency: INR (₹), always format with `toLocaleString('en-IN')`
- Pincode: 6 digits, auto-fill city + state
- Phone: 10 digits, validate format
- GST: 5% on clothing (handle in order total calculation)
- COD: available, handled by Shiprocket
- Prepaid incentive: ₹100 off or free gift wrapping — show on cart page

---

*This file is the single source of truth for the Biahama codebase.
When in doubt — refer back here.*
