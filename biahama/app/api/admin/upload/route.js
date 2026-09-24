// ============================================================
// ADMIN API: product photos
// ============================================================
//   POST   /api/admin/upload            -> upload one photo
//            (multipart form: 'file' = the image, 'productId')
//   DELETE /api/admin/upload?imageId=x  -> remove a photo
//   PATCH  /api/admin/upload            -> reorder / set primary
//            (JSON: { imageId, action: 'makePrimary'|'moveUp'|'moveDown' })
//
// Photos are stored on Cloudinary (the image hosting service the
// seed scripts already used); our database only keeps the URL.
// The PRIMARY photo is the one shown on the shop listing page.
// ============================================================

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'
import { withErrorLogging } from '@/lib/logger'
import cloudinary from '@/lib/cloudinary'

// 10 MB is plenty for a product photo. Bigger files are usually
// a mistake (a RAW camera file) and would make the site slow.
const MAX_FILE_BYTES = 10 * 1024 * 1024

// ------------------------------------------------------------
// POST — upload a photo and attach it to a product.
// ------------------------------------------------------------
export const POST = withErrorLogging('api/admin/upload POST', async (req) => {
  try {
    await requireAdmin()

    // The form sends the file and the product id together.
    const form = await req.formData().catch(() => null)
    if (!form) {
      return NextResponse.json(
        { error: 'Expected a form upload with a file — please try again.' },
        { status: 400 }
      )
    }

    const file = form.get('file')
    const productId = form.get('productId')

    // Check every input before doing anything expensive.
    if (!file || typeof file === 'string' || typeof file.arrayBuffer !== 'function') {
      return NextResponse.json({ error: 'No file was attached.' }, { status: 400 })
    }
    if (!file.type || !file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: `That file is not an image (it is "${file.type || 'unknown'}"). Please choose a JPG, PNG or WebP.` },
        { status: 400 }
      )
    }
    if (file.size >= MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: 'That image is larger than 10 MB. Please use a smaller version.' },
        { status: 400 }
      )
    }

    // Two kinds of upload share this route:
    // - WITH a productId  -> a product photo (saved to the product)
    // - WITHOUT productId -> a site image (used for banner images
    //   etc.) — we just upload it and hand back the URL.
    const isSiteUpload = !productId

    let product = null
    if (!isSiteUpload) {
      if (typeof productId !== 'string') {
        return NextResponse.json({ error: 'Missing productId — which product is this photo for?' }, { status: 400 })
      }
      // Make sure the product actually exists.
      product = await prisma.product.findUnique({
        where: { id: productId },
        include: { images: true },
      })
      if (!product) {
        return NextResponse.json({ error: 'Product not found — save the product first, then add photos.' }, { status: 404 })
      }
    }

    // Turn the file into a "data URI" (the whole image as text) and
    // hand it to Cloudinary. This avoids fiddly streaming code.
    const buffer = Buffer.from(await file.arrayBuffer())
    const dataUri = `data:${file.type};base64,${buffer.toString('base64')}`

    let uploaded
    try {
      uploaded = await cloudinary.uploader.upload(dataUri, {
        // Site images and product photos live in separate folders.
        folder: isSiteUpload ? 'biahama/site' : 'biahama/admin-uploads',
        resource_type: 'image',
      })
    } catch (cloudErr) {
      return NextResponse.json(
        { error: `The image host (Cloudinary) rejected the upload: ${cloudErr?.message || 'unknown error'}` },
        { status: 502 }
      )
    }

    // Site upload: no database row needed — the settings editor
    // stores the URL itself (e.g. as a collection banner image).
    if (isSiteUpload) {
      return NextResponse.json({ url: uploaded.secure_url }, { status: 201 })
    }

    // New photo goes at the END of the row (highest sortOrder + 1),
    // and becomes the primary photo only if it's the very first one.
    const maxSort = product.images.reduce((max, img) => Math.max(max, img.sortOrder), 0)
    const image = await prisma.productImage.create({
      data: {
        productId,
        url:       uploaded.secure_url,
        altText:   product.name, // screen readers / broken-image text
        sortOrder: maxSort + 1,
        isPrimary: product.images.length === 0,
      },
    })

    return NextResponse.json({ image }, { status: 201 })
  } catch (err) {
    if (err.statusCode) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    throw err
  }
})

// ------------------------------------------------------------
// DELETE — remove a photo. If it was the primary photo, the next
// photo in line automatically becomes primary.
// ------------------------------------------------------------
export const DELETE = withErrorLogging('api/admin/upload DELETE', async (req) => {
  try {
    await requireAdmin()

    const imageId = new URL(req.url).searchParams.get('imageId')
    if (!imageId) {
      return NextResponse.json({ error: 'Missing imageId — which photo should be removed?' }, { status: 400 })
    }

    const image = await prisma.productImage.findUnique({ where: { id: imageId } })
    if (!image) {
      return NextResponse.json({ error: 'Photo not found (maybe already deleted).' }, { status: 404 })
    }

    await prisma.$transaction(async (tx) => {
      await tx.productImage.delete({ where: { id: imageId } })

      // If we just deleted the primary photo, promote the next one
      // (lowest sortOrder) so the shop page never shows a blank.
      if (image.isPrimary) {
        const next = await tx.productImage.findFirst({
          where: { productId: image.productId },
          orderBy: { sortOrder: 'asc' },
        })
        if (next) {
          await tx.productImage.update({
            where: { id: next.id },
            data: { isPrimary: true },
          })
        }
      }
    })

    // Note: we do NOT delete the file from Cloudinary itself — old
    // order emails may still show it, and storage is cheap.
    return NextResponse.json({ ok: true, message: 'Photo removed.' })
  } catch (err) {
    if (err.statusCode) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    throw err
  }
})

// ------------------------------------------------------------
// PATCH — make a photo primary, or move it left/right in the row.
// ------------------------------------------------------------
const patchSchema = z.object({
  imageId: z.string().min(1, 'Missing imageId'),
  action:  z.enum(['makePrimary', 'moveUp', 'moveDown']),
})

export const PATCH = withErrorLogging('api/admin/upload PATCH', async (req) => {
  try {
    await requireAdmin()

    const parsed = patchSchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }
    const { imageId, action } = parsed.data

    const image = await prisma.productImage.findUnique({ where: { id: imageId } })
    if (!image) {
      return NextResponse.json({ error: 'Photo not found.' }, { status: 404 })
    }

    if (action === 'makePrimary') {
      // Exactly one primary photo per product: switch the old one
      // off and this one on, in a single all-or-nothing step.
      await prisma.$transaction([
        prisma.productImage.updateMany({
          where: { productId: image.productId },
          data: { isPrimary: false },
        }),
        prisma.productImage.update({
          where: { id: imageId },
          data: { isPrimary: true },
        }),
      ])
    } else {
      // moveUp = earlier in the row, moveDown = later. We find the
      // neighbouring photo and swap the two sortOrder numbers.
      const neighbour = await prisma.productImage.findFirst({
        where: {
          productId: image.productId,
          sortOrder: action === 'moveUp'
            ? { lt: image.sortOrder }
            : { gt: image.sortOrder },
        },
        orderBy: { sortOrder: action === 'moveUp' ? 'desc' : 'asc' },
      })

      if (!neighbour) {
        // Already first (or last) — nothing to swap with.
        return NextResponse.json({ ok: true, message: 'That photo is already at the end.' })
      }

      await prisma.$transaction([
        prisma.productImage.update({
          where: { id: image.id },
          data: { sortOrder: neighbour.sortOrder },
        }),
        prisma.productImage.update({
          where: { id: neighbour.id },
          data: { sortOrder: image.sortOrder },
        }),
      ])
    }

    // Send back the full, freshly ordered photo list so the form
    // can redraw itself without a second request.
    const images = await prisma.productImage.findMany({
      where: { productId: image.productId },
      orderBy: { sortOrder: 'asc' },
    })
    return NextResponse.json({ ok: true, images })
  } catch (err) {
    if (err.statusCode) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    throw err
  }
})
