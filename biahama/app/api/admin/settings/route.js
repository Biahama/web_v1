// ============================================================
// ADMIN SETTINGS API — read & save the theme/layout settings
// ============================================================
// GET  -> the current settings (defaults merged with anything
//         the admins saved before).
// PUT  -> save new settings. Only people on the ADMIN_EMAILS
//         list may do this. Every value is checked (Zod) before
//         it touches the database, and after saving we tell
//         Next.js to repaint the live site immediately.
// ============================================================

import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'
import { getSiteSettings } from '@/lib/site-settings'
import { withErrorLogging } from '@/lib/logger'

// ---- What a valid "save settings" request looks like. ----
// Everything is optional: the editor only sends what it manages.
// Unknown layout keys are quietly dropped (Zod strips them), so
// a bad request can never write junk into the database.
const layoutSchema = z.object({
  showAnnouncementBar: z.boolean().optional(),
  announcementText: z.string().max(300).optional(),
  heroHeadline: z.string().max(200).optional(),
  heroButtonText: z.string().max(60).optional(),
  heroFocalX: z.number().min(0).max(100).optional(),
  heroFocalY: z.number().min(0).max(100).optional(),
  collectionBannerSide: z.enum(['left', 'right']).optional(),
})

const bodySchema = z.object({
  theme: z
    .object({
      // e.g. { "--black": "#222222" } — CSS variable -> value
      overrides: z.record(z.string(), z.string()).optional(),
      fonts: z
        .object({
          display: z.string().min(1, 'Headings font cannot be empty'),
          ui: z.string().min(1, 'Body font cannot be empty'),
        })
        .optional(),
    })
    .optional(),
  layout: layoutSchema.optional(),
})

// ---- GET: return the current settings. ----
export const GET = withErrorLogging('api/admin/settings GET', async () => {
  // Security rule: every /api/admin/* route checks the admin first.
  try {
    await requireAdmin()
  } catch (err) {
    if (err.statusCode) return NextResponse.json({ error: err.message }, { status: err.statusCode })
    throw err
  }

  const settings = await getSiteSettings()
  return NextResponse.json(settings)
})

// ---- PUT: save new settings. ----
export const PUT = withErrorLogging('api/admin/settings PUT', async (req) => {
  // Security rule: every /api/admin/* route checks the admin first.
  try {
    await requireAdmin()
  } catch (err) {
    if (err.statusCode) return NextResponse.json({ error: err.message }, { status: err.statusCode })
    throw err
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }
  const { theme, layout } = parsed.data

  // Save each provided piece under its own key in SiteSetting.
  // "upsert" = update the row if it exists, create it otherwise.
  if (theme !== undefined) {
    await prisma.siteSetting.upsert({
      where: { key: 'theme' },
      update: { value: theme },
      create: { key: 'theme', value: theme },
    })
  }
  if (layout !== undefined) {
    await prisma.siteSetting.upsert({
      where: { key: 'layout' },
      update: { value: layout },
      create: { key: 'layout', value: layout },
    })
  }

  // Tell Next.js "the whole site changed" so visitors see the new
  // theme right away instead of a cached copy.
  revalidatePath('/', 'layout')

  return NextResponse.json({ ok: true })
})
