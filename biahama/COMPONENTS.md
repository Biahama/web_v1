# Biahama — Component Reference

## State Management

### Cart State — `lib/cart.js`
- React Context (`CartContext`) provided by `CartProvider`
- Wrapped in `components/providers.jsx` which also wraps `SessionProvider`
- Mounted in `app/layout.tsx` via `<Providers>`

**Context shape:**
```js
{
  items:     Array<{ variantId, quantity, variant: { id, price, size, color, product: { name, slug } } }>,
  count:     number,          // total item count (sum of quantities)
  add:       (variant, qty?) => void,
  remove:    (variantId) => void,
  updateQty: (variantId, qty) => void,
  clear:     () => void,
}
```

**Behaviour:**
- Guest: reads/writes localStorage key `biahama_cart`
- Logged in: syncs to `/api/cart` (DB) on every mutation
- On login: merges localStorage cart into DB cart, clears localStorage

### Auth State — NextAuth
- Session available via `useSession()` (client) or `getServerSession(authOptions)` (server)
- JWT strategy — no DB sessions
- `authOptions` exported from `lib/auth.js`

---

## Layout Components

### `components/layout/Navbar.jsx`
**Props:** none (reads from `useCart()` and `useSession()`)

**Renders:**
- Fixed top bar, white/bg background, 1px border-bottom
- Left: empty
- Center: `BIAHAMA` — Cormorant Garamond, 28px, letterSpacing 0.25em
- Right: Search icon · SHOP link · Hanger SVG (Wardrobe) · Shopping bag SVG (Cart) with count badge

**Badge:** always visible, 13×13px circle, top:-5 right:-7 of cart icon

**Note:** CartDrawer and SearchOverlay are wired but the overlay/drawer open state is local to Navbar.

---

### `components/layout/Footer.jsx`
**Props:** none

**Renders:**
- Brand tagline (italic Cormorant Garamond)
- 3 columns: Company · Help · Follow
- Footer strip with copyright
- Padding: 48px horizontal

---

### `components/layout/AnnouncementBar.jsx`
**Props:** none

**Renders:**
- Black background, white text, 10px font, 0.18em letter-spacing
- Current text: free shipping offer + brand tagline

---

## Product Components

### `components/product/CategoryTabs.jsx`
**Props:**
```js
{
  active:   string,           // e.g. 'KURTAS'
  onChange: (cat) => void,
}
```

**Tab values:** `['ALL', 'TUNICS', 'SHIRTS', 'KURTAS', 'DRESSES', 'SETS', 'TROUSERS', 'JACKETS', 'WRAPS']`

**Styling:** active tab has 1px solid underline, paddingRight: 20, marginRight: 8 per tab

---

### `components/product/ProductGrid.jsx`
**Props:**
```js
{
  products: Array<{
    id, name, slug, category,
    priceRange: { min, max },   // in paise
    primaryImage: { url, altText } | null,
  }>,
  pinnedId?: string,            // product id to show first with "Selected" badge
}
```

**Behaviour:**
- When `products` is empty: renders 6 placeholder cards (#e8e4de background, name centered)
- Pinned product shown first with black outline + "Selected" badge
- Links to `/products/{slug}`

---

### `components/ui/ProductCard.jsx`
**Props:**
```js
{
  product: {
    id, name, slug,
    priceRange: { min, max },
    primaryImage: { url, altText } | null,
  },
  pinned?: boolean,
}
```

**Behaviour:**
- Wardrobe (hanger) button appears on hover, top-right corner
- "Only X left" badge when stockQty ≤ 3 (not yet wired — needs variant stockQty on card)
- Links to `/products/{slug}`

---

### `components/ui/CartDrawer.jsx`
**Props:** none (reads from `useCart()`)

**Status:** Component exists but NOT yet wired to navbar open/close state. Needs:
- Navbar to lift `drawerOpen` state and pass setter down, OR
- A global drawer context

---

### `components/ui/SearchOverlay.jsx`
**Props:** none (reads products from `/api/products`)

**Status:** Component exists, uses Fuse.js (`lib/fuse.js`). Needs to be wired to Navbar search icon click.

---

### `components/providers.jsx`
**Props:** `{ children }`

**Wraps:** `SessionProvider` (NextAuth) → `CartProvider` (cart context)

Mounted in `app/layout.tsx`.

---

## Page Components (not reusable, no props — all read from hooks/params)

### `app/(main)/page.jsx` — Homepage
- 8 editorial sections, each: one-liner text + 75vh campaign image block
- One-liners map categories to evocative phrases (e.g. Kurtas → "The art of the everyday")
- Clicking image or text → `/shop/[category]`

### `app/(main)/shop/page.jsx` — Shop All
- CategoryTabs (active tab updates page title)
- Fetches products from `/api/products?category={active}`
- ProductGrid with results

### `app/(main)/shop/[category]/page.jsx` — Category Landing
- Hero: full-width 90vh image with category name overlay (72px italic, bottom-left)
- CategoryTabs below hero
- Reads `?pid=` query param → pinned product in grid
- ProductGrid

### `app/(main)/cart/page.jsx` — Cart + Address
**Local state:**
- `items, remove, updateQty` from `useCart()`
- `addresses` — fetched from `/api/addresses` on mount
- `selectedAddress` — ID of selected address
- `showAddressForm` — boolean toggle for new address form
- `addressForm` — controlled form object `{ fullName, phone, line1, line2, pincode, city, state, isDefault }`
- `pincodeLoading` — India Post API call in progress

**Pincode autocomplete:** on 6-digit pincode entry, calls India Post API, auto-fills city + state

**Pricing constants:**
```js
SHIPPING_THRESHOLD = 300000  // ₹3000 in paise
SHIPPING_COST      = 9900    // ₹99 in paise
GST_RATE           = 0.05
```

**Proceed to Pay:**
- Calls `POST /api/payments/create-order` with `{ addressId }`
- Stores full response + addressId in `sessionStorage('biahama_checkout')`
- Redirects to `/checkout`

### `app/(main)/checkout/page.jsx` — Payment
**Local state:**
- `checkout` — read from `sessionStorage('biahama_checkout')` on mount
- `sdkReady` — Razorpay SDK loaded flag

**Flow:**
- Loads Razorpay SDK via `next/script`
- `openRazorpay()` — opens popup with stored order details
- On success → `POST /api/payments/verify` → clear sessionStorage + cart → redirect to `/orders/{id}`
- `handleCOD()` → `POST /api/payments/verify` with `paymentMethod: 'cod'` → same redirect

### `app/(main)/orders/[id]/page.jsx` — Order Confirmation
- Fetches from `GET /api/orders/{id}` on mount
- Shows: order ID, status, shipping status, AWB (if available), items list, totals, delivery address
- Links to Continue Shopping + View All Orders

### `app/(auth)/login/page.jsx` — Login
**Two-step flow:**
1. Step 1: email input → "Continue" → checks if user exists
2. Step 2: password input → `signIn('credentials', ...)` → redirect

**Also:** Google OAuth button (`signIn('google')`)

**Layout:** Two-column — left: #e8e4de campaign image column, right: white form column

### `app/(auth)/signup/page.jsx` — Signup
- `POST /api/auth/signup` with `{ name, email, password }`
- On success → `signIn('credentials', ...)` auto-login

---

## Missing Pages (Not Yet Built)

| Page | Path | Phase |
|------|------|-------|
| Product Detail | `/products/[slug]/page.jsx` | Phase 8 |
| Account Dashboard | `/account/page.jsx` | Phase 8 |
| Order History | `/account/orders/page.jsx` | Phase 8 |
| Wardrobe/Wishlist | `/account/wardrobe/page.jsx` | Phase 8 |

---

## Design Token Reference

```css
--white:  #ffffff
--bg:     #f0ede8   /* warm off-white, page background */
--black:  #1a1814   /* near-black */
--gray:   #8a8480
--border: #ddd9d3
--light:  #e8e4de
```

**Fonts (CSS vars set in app/layout.tsx):**
- `--font-cormorant` — Cormorant Garamond, weight 300, often italic — headings/display
- `--font-jost` — Jost, weight 300–500 — body/UI

**Never hardcode hex values. Always use CSS vars.**
