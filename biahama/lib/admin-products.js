// ============================================================
// Small helpers for the admin Products manager.
// Used by /api/admin/products and /api/admin/products/[id].
// ============================================================

import { prisma } from './prisma'

// Turn "Sage Volume Trouser" into "sage-volume-trouser"
// (the web address of the product page).
export function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // anything that isn't a letter/number becomes "-"
    .replace(/(^-|-$)+/g, '')    // trim leading/trailing dashes
}

// Two products can't share a web address. If "sage-trouser" is
// taken we try "sage-trouser-2", "-3", ... until one is free.
export async function makeUniqueSlug(name) {
  const base = slugify(name) || 'product'
  let slug = base
  for (let n = 2; ; n++) {
    const taken = await prisma.product.findUnique({ where: { slug } })
    if (!taken) return slug
    slug = `${base}-${n}`
  }
}

// Build a stock-keeping code (SKU) when the admin leaves it blank.
// Pattern: BIA-<first 3 of category>-<first 4 of slug>-<size>
// e.g. BIA-TRO-SAGE-XL. SKUs must be unique across the whole shop,
// so if it's taken we append -2, -3, ...
// `usedInThisRequest` (a Set) stops two blank rows in the SAME
// request from getting the same code.
export async function makeUniqueSku(category, slug, size, usedInThisRequest) {
  const catPart  = String(category).replace(/[^a-z0-9]/gi, '').slice(0, 3)
  const slugPart = String(slug).replace(/[^a-z0-9]/gi, '').slice(0, 4)
  const base = `BIA-${catPart}-${slugPart}-${size}`.toUpperCase().replace(/\s+/g, '')
  let sku = base
  for (let n = 2; ; n++) {
    const takenInDb = await prisma.productVariant.findUnique({ where: { sku } })
    if (!takenInDb && !usedInThisRequest.has(sku)) {
      usedInThisRequest.add(sku)
      return sku
    }
    sku = `${base}-${n}`
  }
}
