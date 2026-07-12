// ============================================================
// ADMIN API: list all products / create a new product
// ============================================================
// This replaces the old terminal seed scripts. The admin panel
// at /admin/products talks to this file.
//
//   GET  /api/admin/products  -> every product (newest first)
//   POST /api/admin/products  -> create a product with its sizes
//
// SECURITY: only admins (emails in ADMIN_EMAILS) may use this.
// PRICES: always stored in PAISE (₹2,450 = 245000). The admin
// form shows rupees and converts before sending.
// ============================================================

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'
import { withErrorLogging } from '@/lib/logger'
import { makeUniqueSlug, makeUniqueSku } from '@/lib/admin-products'

// ------------------------------------------------------------
// What a valid "create product" request must look like.
// Anything that doesn't match is rejected with a clear message.
// ------------------------------------------------------------
const variantSchema = z.object({
  size:         z.string().min(1, 'Every size row needs a size (e.g. M)'),
  color:        z.string().min(1, 'Every size row needs a color name'),
  colorHex:     z.string().optional().nullable(),        // e.g. "#1e293b", optional
  price:        z.number().int().positive('Price must be a positive whole number (in paise)'),
  comparePrice: z.number().int().positive().optional().nullable(), // "was ₹X" strike-through price
  stockQty:     z.number().int().min(0, 'Stock cannot be negative'),
  sku:          z.string().optional().nullable(),        // left blank = we generate one
})

const productSchema = z.object({
  name:        z.string().min(2, 'Product name must be at least 2 characters'),
  category:    z.string().min(2, 'Category must be at least 2 characters'),
  description: z.string().optional().nullable(),
  fabric:      z.string().optional().nullable(),
  care:        z.string().optional().nullable(),
  isActive:    z.boolean().default(true),
  variants:    z.array(variantSchema).min(1, 'Add at least one size row'),
})

// ------------------------------------------------------------
// GET — list every product with its sizes, photos, and how many
// times it has been ordered (so you know what's safe to delete).
// ------------------------------------------------------------
export const GET = withErrorLogging('api/admin/products GET', async () => {
  try {
    await requireAdmin()

    const products = await prisma.product.findMany({
      orderBy: { createdAt: 'desc' }, // newest products first
      include: {
        images:   { orderBy: { sortOrder: 'asc' } },
        variants: {
          orderBy: { createdAt: 'asc' },
          // For each size, count how many order lines reference it.
          include: { _count: { select: { orderItems: true } } },
        },
      },
    })

    // Add a simple per-product total: "this product appears in N order lines"
    const withCounts = products.map((p) => ({
      ...p,
      orderItemCount: p.variants.reduce((sum, v) => sum + v._count.orderItems, 0),
    }))

    return NextResponse.json({ products: withCounts })
  } catch (err) {
    // Errors we raised on purpose carry a status code (403 = not admin).
    if (err.statusCode) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    throw err // anything unexpected -> logged by withErrorLogging
  }
})

// ------------------------------------------------------------
// POST — create a new product with its size rows.
// ------------------------------------------------------------
export const POST = withErrorLogging('api/admin/products POST', async (req) => {
  try {
    await requireAdmin()

    // Never trust the browser: validate everything.
    const parsed = productSchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }
    const data = parsed.data

    // The server decides the slug (web address) — never the browser.
    const slug = await makeUniqueSlug(data.name)

    // Fill in SKUs for size rows where the admin left it blank.
    const usedSkus = new Set()
    const variantsToCreate = []
    for (const v of data.variants) {
      const sku = v.sku && v.sku.trim()
        ? v.sku.trim()
        : await makeUniqueSku(data.category, slug, v.size, usedSkus)

      // Same SKU typed twice in one request? Stop with a clear error.
      if (usedSkus.has(sku)) {
        return NextResponse.json(
          { error: `Two size rows have the same SKU (${sku}). Each SKU must be unique.` },
          { status: 400 }
        )
      }
      usedSkus.add(sku)

      variantsToCreate.push({
        size:         v.size.trim(),
        color:        v.color.trim(),
        colorHex:     v.colorHex?.trim() || null,
        price:        v.price,                 // already in paise
        comparePrice: v.comparePrice ?? null,
        stockQty:     v.stockQty,
        sku,
      })
    }

    const product = await prisma.product.create({
      data: {
        name:        data.name.trim(),
        slug,
        description: data.description?.trim() || null,
        category:    data.category.trim(),
        fabric:      data.fabric?.trim() || null,
        care:        data.care?.trim() || null,
        isActive:    data.isActive,
        variants:    { create: variantsToCreate },
      },
      include: {
        variants: { orderBy: { createdAt: 'asc' } },
        images:   { orderBy: { sortOrder: 'asc' } },
      },
    })

    return NextResponse.json({ product }, { status: 201 })
  } catch (err) {
    // P2002 = the database refused a duplicate (e.g. a SKU the admin
    // typed already exists on another product).
    if (err.code === 'P2002') {
      return NextResponse.json(
        { error: 'A SKU or slug like this already exists. Please change the SKU and try again.' },
        { status: 400 }
      )
    }
    if (err.statusCode) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    throw err
  }
})
