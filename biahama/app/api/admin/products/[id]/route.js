// ============================================================
// ADMIN API: view / edit / delete ONE product
// ============================================================
//   GET    /api/admin/products/<id>  -> the product with sizes+photos
//   PATCH  /api/admin/products/<id>  -> save changes from the edit form
//   DELETE /api/admin/products/<id>  -> delete (or archive, see below)
//
// IMPORTANT SAFETY RULES built into this file:
//  * The slug (web address) NEVER changes after creation. Changing
//    it would break links customers saved, Google results, and old
//    order emails — so the edit form simply can't touch it.
//  * A size that has been SOLD is never deleted. Deleting it would
//    orphan old orders. Instead its stock is set to 0 so it
//    disappears from the shop but keeps its history.
//  * A product that has been ordered is never deleted — it is
//    archived (hidden from the shop) instead.
// ============================================================

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'
import { withErrorLogging } from '@/lib/logger'
import { makeUniqueSku } from '@/lib/admin-products'

// ------------------------------------------------------------
// What the edit form may send. Everything is optional — the form
// only needs to send the fields that changed. Note: NO slug field.
// ------------------------------------------------------------
const variantSchema = z.object({
  id:           z.string().optional(),          // present = existing size row
  size:         z.string().min(1, 'Every size row needs a size (e.g. M)'),
  color:        z.string().min(1, 'Every size row needs a color name'),
  colorHex:     z.string().optional().nullable(),
  price:        z.number().int().positive('Price must be a positive whole number (in paise)'),
  comparePrice: z.number().int().positive().optional().nullable(),
  stockQty:     z.number().int().min(0, 'Stock cannot be negative'),
  sku:          z.string().optional().nullable(),
})

const patchSchema = z.object({
  name:        z.string().min(2, 'Product name must be at least 2 characters').optional(),
  category:    z.string().min(2, 'Category must be at least 2 characters').optional(),
  description: z.string().optional().nullable(),
  fabric:      z.string().optional().nullable(),
  care:        z.string().optional().nullable(),
  isActive:    z.boolean().optional(),
  // When present, this is the COMPLETE new list of sizes.
  // Rows with an `id` update that row; rows without `id` are new;
  // existing rows missing from the list are removed (safely).
  variants:    z.array(variantSchema).min(1, 'A product needs at least one size row').optional(),
})

// ------------------------------------------------------------
// GET — one product with its sizes and photos.
// ------------------------------------------------------------
export const GET = withErrorLogging('api/admin/products/[id] GET', async (req, { params }) => {
  try {
    await requireAdmin()
    const { id } = await params // Next.js gives params as a promise

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        variants: { orderBy: { createdAt: 'asc' } },
        images:   { orderBy: { sortOrder: 'asc' } },
      },
    })
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }
    return NextResponse.json({ product })
  } catch (err) {
    if (err.statusCode) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    throw err
  }
})

// ------------------------------------------------------------
// PATCH — save changes from the edit form.
// ------------------------------------------------------------
export const PATCH = withErrorLogging('api/admin/products/[id] PATCH', async (req, { params }) => {
  try {
    await requireAdmin()
    const { id } = await params

    const parsed = patchSchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }
    const data = parsed.data

    // Load the product as it is right now, with its current sizes.
    const existing = await prisma.product.findUnique({
      where: { id },
      include: { variants: true },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Simple text fields: only touch the ones the form actually sent.
    // (The slug is deliberately NOT here — see the note at the top.)
    const productChanges = {}
    if (data.name !== undefined)        productChanges.name        = data.name.trim()
    if (data.category !== undefined)    productChanges.category    = data.category.trim()
    if (data.description !== undefined) productChanges.description = data.description?.trim() || null
    if (data.fabric !== undefined)      productChanges.fabric      = data.fabric?.trim() || null
    if (data.care !== undefined)        productChanges.care        = data.care?.trim() || null
    if (data.isActive !== undefined)    productChanges.isActive    = data.isActive

    // A note before the size logic: every size row sent by the form
    // must either be new (no id) or belong to THIS product. A row
    // claiming an id from a different product is rejected.
    if (data.variants) {
      const ownIds = new Set(existing.variants.map((v) => v.id))
      for (const v of data.variants) {
        if (v.id && !ownIds.has(v.id)) {
          return NextResponse.json(
            { error: 'One of the size rows does not belong to this product.' },
            { status: 400 }
          )
        }
      }
    }

    // Do ALL the changes in one transaction: either everything
    // saves, or nothing does (no half-saved products).
    const removedButSold = [] // names of sizes we kept for history
    await prisma.$transaction(async (tx) => {
      await tx.product.update({ where: { id }, data: productChanges })

      if (!data.variants) return // form didn't touch the sizes

      const sentIds = new Set(data.variants.filter((v) => v.id).map((v) => v.id))
      const usedSkus = new Set()

      // 1) Existing rows that are NOT in the new list -> remove them.
      for (const old of existing.variants) {
        if (sentIds.has(old.id)) continue

        // Has this size ever been sold? (appears in any order line)
        const soldCount = await tx.orderItem.count({ where: { variantId: old.id } })

        if (soldCount > 0) {
          // Sold variants keep their history: old orders point at this
          // row, so we can't delete it. Setting stock to 0 hides it
          // from the shop, which is what the admin actually wanted.
          await tx.productVariant.update({
            where: { id: old.id },
            data: { stockQty: 0 },
          })
          removedButSold.push(`${old.size} / ${old.color}`)
        } else {
          // Never sold — safe to fully delete. First clear anything
          // else that points at it, or the database would refuse:
          await tx.cart.deleteMany({ where: { variantId: old.id } })     // shoppers' carts
          await tx.waitlist.deleteMany({ where: { variantId: old.id } }) // notify-me signups
          await tx.productImage.updateMany({                             // photos tied to this size
            where: { variantId: old.id },
            data: { variantId: null }, // keep the photo, just untie it
          })
          await tx.productVariant.delete({ where: { id: old.id } })
        }
      }

      // 2) Rows WITH an id -> update that existing size.
      for (const v of data.variants) {
        if (!v.id) continue
        await tx.productVariant.update({
          where: { id: v.id },
          data: {
            size:         v.size.trim(),
            color:        v.color.trim(),
            colorHex:     v.colorHex?.trim() || null,
            price:        v.price, // paise
            comparePrice: v.comparePrice ?? null,
            stockQty:     v.stockQty,
            // sku is only changed if the form sent a non-empty one
            ...(v.sku && v.sku.trim() ? { sku: v.sku.trim() } : {}),
          },
        })
      }

      // 3) Rows WITHOUT an id -> brand new sizes.
      for (const v of data.variants) {
        if (v.id) continue
        const sku = v.sku && v.sku.trim()
          ? v.sku.trim()
          : await makeUniqueSku(
              data.category ?? existing.category,
              existing.slug,
              v.size,
              usedSkus
            )
        await tx.productVariant.create({
          data: {
            productId:    id,
            size:         v.size.trim(),
            color:        v.color.trim(),
            colorHex:     v.colorHex?.trim() || null,
            price:        v.price, // paise
            comparePrice: v.comparePrice ?? null,
            stockQty:     v.stockQty,
            sku,
          },
        })
      }
    })

    // Send back the freshly saved product so the form can refresh.
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        variants: { orderBy: { createdAt: 'asc' } },
        images:   { orderBy: { sortOrder: 'asc' } },
      },
    })

    let message = 'Saved.'
    if (removedButSold.length > 0) {
      message += ` Note: ${removedButSold.join(', ')} could not be deleted because customers have ordered it — stock was set to 0 instead (old orders keep their history).`
    }
    return NextResponse.json({ product, message })
  } catch (err) {
    // P2002 = duplicate SKU typed by the admin.
    if (err.code === 'P2002') {
      return NextResponse.json(
        { error: 'That SKU already exists on another size or product. Please pick a different one.' },
        { status: 400 }
      )
    }
    if (err.statusCode) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    throw err
  }
})

// ------------------------------------------------------------
// DELETE — delete a product, or ARCHIVE it if it has ever been
// ordered. Archiving keeps old orders intact but hides the
// product from the shop (isActive = false).
// ------------------------------------------------------------
export const DELETE = withErrorLogging('api/admin/products/[id] DELETE', async (req, { params }) => {
  try {
    await requireAdmin()
    const { id } = await params

    const product = await prisma.product.findUnique({
      where: { id },
      include: { variants: { select: { id: true } } },
    })
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const variantIds = product.variants.map((v) => v.id)

    // Has ANY size of this product ever been ordered?
    const soldCount = variantIds.length
      ? await prisma.orderItem.count({ where: { variantId: { in: variantIds } } })
      : 0

    if (soldCount > 0) {
      // Ordered before -> archive instead of delete, so order
      // history stays intact. It disappears from the shop.
      await prisma.product.update({ where: { id }, data: { isActive: false } })
      return NextResponse.json({
        archived: true,
        message:
          'This product has been ordered by customers, so it was HIDDEN from the shop instead of deleted. Old orders keep their history.',
      })
    }

    // Never ordered -> safe to remove completely. Delete everything
    // that points at it first (the database enforces this order),
    // all inside one transaction so it's all-or-nothing.
    await prisma.$transaction(async (tx) => {
      if (variantIds.length) {
        await tx.cart.deleteMany({ where: { variantId: { in: variantIds } } })
        await tx.waitlist.deleteMany({ where: { variantId: { in: variantIds } } })
      }
      await tx.review.deleteMany({ where: { productId: id } })
      await tx.productImage.deleteMany({ where: { productId: id } })
      await tx.productVariant.deleteMany({ where: { productId: id } })
      await tx.product.delete({ where: { id } })
    })

    return NextResponse.json({
      archived: false,
      message: 'Product deleted completely (it was never ordered).',
    })
  } catch (err) {
    if (err.statusCode) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    throw err
  }
})
