// ============================================================
// ADMIN API — edit the site's content pages (About, Shipping...)
// ============================================================
// GET    -> list all 8 pages (your edited text, or the default)
// PUT    -> save new text for one page
// DELETE -> ?slug=about  removes your edit, restoring the default
//
// Saving/deleting also refreshes the live public page right away
// (revalidatePath), so changes appear without waiting.
// SECURITY: every handler calls requireAdmin() first.
// ============================================================

import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'
import { withErrorLogging } from '@/lib/logger'
import { DEFAULT_PAGES, CONTENT_SLUGS } from '@/lib/content-pages'

// What a valid "save" request must look like.
const putSchema = z.object({
  slug:  z.enum(CONTENT_SLUGS),
  title: z.string().min(1, 'Title is required').max(120, 'Title is too long (max 120 characters)'),
  body:  z.string().max(20000, 'Body is too long (max 20,000 characters)'),
})

// ---- GET: all pages, flagged edited/default -----------------
export const GET = withErrorLogging('api/admin/content GET', async () => {
  try {
    await requireAdmin()

    const rows = await prisma.contentPage.findMany()
    const bySlug = Object.fromEntries(rows.map((r) => [r.slug, r]))

    // One entry per known page: the saved version if it exists,
    // otherwise the built-in default.
    const pages = CONTENT_SLUGS.map((slug) => {
      const saved = bySlug[slug]
      return {
        slug,
        title:  saved?.title ?? DEFAULT_PAGES[slug].title,
        body:   saved?.body ?? DEFAULT_PAGES[slug].body,
        edited: Boolean(saved),
      }
    })

    return NextResponse.json({ pages })
  } catch (err) {
    // Errors we raised ourselves (like "not an admin") carry a
    // status code and a message that is safe to show.
    if (err.statusCode) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    throw err // anything else is logged by withErrorLogging
  }
})

// ---- PUT: save one page's text ------------------------------
export const PUT = withErrorLogging('api/admin/content PUT', async (req) => {
  try {
    await requireAdmin()

    const parsed = putSchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }
    const { slug, title, body } = parsed.data

    // Update the row if it exists, create it if it doesn't.
    await prisma.contentPage.upsert({
      where:  { slug },
      update: { title, body },
      create: { slug, title, body },
    })

    // Refresh the live page immediately.
    revalidatePath('/' + slug)

    return NextResponse.json({ ok: true, slug })
  } catch (err) {
    if (err.statusCode) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    throw err
  }
})

// ---- DELETE: remove an edit, restoring the default ----------
export const DELETE = withErrorLogging('api/admin/content DELETE', async (req) => {
  try {
    await requireAdmin()

    const slug = new URL(req.url).searchParams.get('slug')
    if (!CONTENT_SLUGS.includes(slug)) {
      return NextResponse.json({ error: 'Unknown page' }, { status: 400 })
    }

    // deleteMany (not delete) so it's fine if there was no edit.
    await prisma.contentPage.deleteMany({ where: { slug } })

    // Refresh the live page immediately.
    revalidatePath('/' + slug)

    return NextResponse.json({ ok: true, slug })
  } catch (err) {
    if (err.statusCode) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    throw err
  }
})
