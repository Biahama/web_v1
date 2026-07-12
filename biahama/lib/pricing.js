// ============================================================
// SINGLE SOURCE OF TRUTH FOR ALL PRICING RULES
// ============================================================
// Change a number here and it changes everywhere:
// cart page, checkout page, and the payment server code.
//
// All amounts are in PAISE (₹1 = 100 paise), because payment
// providers work in paise and it avoids decimal rounding bugs.
// Example: 245000 = ₹2,450.00
//
// PRICING MODEL: prices are GST-INCLUSIVE.
// The price shown on the product page is the final price.
// GST is displayed at checkout as an informational line only
// ("includes 5% GST") — it is NOT added on top.
// ============================================================

export const SHIPPING_THRESHOLD = 300000 // free shipping at ₹3,000 and above
export const SHIPPING_COST = 9900 // ₹99 otherwise
export const GST_RATE = 0.05 // 5% GST (informational — already inside the price)

/**
 * Compute order totals from cart items.
 * Works with items shaped like: { variant: { price }, quantity }
 *
 * Returns (all in paise):
 *   subtotal    - sum of item prices (GST already included)
 *   shipping    - 0 or SHIPPING_COST
 *   gstIncluded - the GST portion already inside the subtotal (info only)
 *   total       - what the customer actually pays = subtotal + shipping
 */
export function computeTotals(items) {
  const subtotal = items.reduce((sum, item) => sum + item.variant.price * item.quantity, 0)
  const shipping = subtotal === 0 || subtotal >= SHIPPING_THRESHOLD ? 0 : SHIPPING_COST
  // Price is 105% of the base amount, so GST inside = price - price/1.05
  const gstIncluded = Math.round(subtotal - subtotal / (1 + GST_RATE))
  const total = subtotal + shipping
  return { subtotal, shipping, gstIncluded, total }
}

/** Format paise as rupees for display, e.g. 245000 -> "₹2,450" */
export function formatPrice(paise) {
  return `₹${(paise / 100).toLocaleString('en-IN')}`
}
