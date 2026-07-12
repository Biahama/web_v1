// ============================================================
// SITE SETTINGS — the heart of "edit without code"
// ============================================================
// HOW IT WORKS (and why it can't break the site):
// 1. The site's real design lives in app/styles/biahama-tokens.css
//    as CSS variables. Those are the permanent DEFAULTS.
// 2. The admin panel saves OVERRIDES to the SiteSetting table.
// 3. Every page loads: defaults first, then overrides on top.
// 4. "Restore defaults" simply deletes the overrides.
//    An invalid value (e.g. a typo'd color) is ignored by the
//    browser, which falls back to the default. Nothing crashes.
// ============================================================

import { prisma } from './prisma'
import { logError } from './logger'

// ---- The knobs the theme editor shows, with friendly labels. ----
// type: 'color' -> color picker, 'size' -> text field like "36px",
//       'text' -> free text
export const EDITABLE_TOKENS = [
  { group: 'Colors', var: '--black', label: 'Main text & buttons color', type: 'color', default: '#1A202C' },
  { group: 'Colors', var: '--bg', label: 'Page background', type: 'color', default: '#ffffff' },
  { group: 'Colors', var: '--gray', label: 'Muted text color', type: 'color', default: '#6f6f6f' },
  { group: 'Colors', var: '--border', label: 'Border lines color', type: 'color', default: '#e5e5e5' },
  { group: 'Colors', var: '--light', label: 'Filter bar background', type: 'color', default: '#f2f2f2' },
  { group: 'Headings', var: '--text-heading-size', label: 'Page heading size', type: 'size', default: '36px' },
  { group: 'Headings', var: '--text-heading-tracking', label: 'Page heading letter spacing', type: 'size', default: '0.72px' },
  { group: 'Product cards', var: '--text-product-name-size', label: 'Product name size', type: 'size', default: '16px' },
  { group: 'Product cards', var: '--text-product-name-tracking', label: 'Product name letter spacing', type: 'size', default: '0.8px' },
  { group: 'Product cards', var: '--text-price-size', label: 'Price size', type: 'size', default: '14px' },
  { group: 'Grid', var: '--grid-col-gap', label: 'Gap between product columns', type: 'size', default: '8px' },
  { group: 'Grid', var: '--grid-row-gap', label: 'Gap between product rows', type: 'size', default: '32px' },
]

// ---- Fonts: type any Google Font name (fonts.google.com). ----
export const DEFAULT_FONTS = {
  display: 'Cormorant Garamond', // headings ("--font-display")
  ui: 'Jost', // everything else ("--font-ui")
}

// ---- Layout & text switches. ----
export const DEFAULT_LAYOUT = {
  showAnnouncementBar: true,
  announcementText:
    'Free shipping on orders above ₹3,000  ·  New collection arriving this season',
  heroHeadline: 'Quiet forms\nfor modern movement.',
  heroButtonText: 'Step Inside',
  // Where the hero image crop is anchored (percent). 65/25 keeps
  // the model framed on all screens.
  heroFocalX: 65,
  heroFocalY: 25,
  // Collection pages: big banner on the 'right' or 'left' of the cards
  collectionBannerSide: 'right',
}

/**
 * Load all settings, merged over defaults. Safe by design:
 * if the database is unreachable, the site quietly uses defaults
 * (and the failure is logged).
 * Returns: { theme: { overrides: {...}, fonts: {...} }, layout: {...} }
 */
export async function getSiteSettings() {
  let rows = []
  try {
    rows = await prisma.siteSetting.findMany()
  } catch (error) {
    await logError('site-settings — load', error, {})
  }
  const saved = Object.fromEntries(rows.map((r) => [r.key, r.value]))

  return {
    theme: {
      overrides: saved.theme?.overrides ?? {},
      fonts: { ...DEFAULT_FONTS, ...(saved.theme?.fonts ?? {}) },
    },
    layout: { ...DEFAULT_LAYOUT, ...(saved.layout ?? {}) },
  }
}

/**
 * Turn theme settings into a CSS string that overrides the
 * default tokens. Values are lightly sanitised (no braces or
 * semicolons) so nothing can inject broken CSS.
 */
export function buildThemeCss(theme) {
  const clean = (v) => String(v).replace(/[{};]/g, '').trim()
  const lines = []

  for (const [name, value] of Object.entries(theme.overrides || {})) {
    if (!name.startsWith('--') || value === '' || value == null) continue
    lines.push(`${clean(name)}: ${clean(value)};`)
  }
  if (theme.fonts.display !== DEFAULT_FONTS.display) {
    lines.push(`--font-display: '${clean(theme.fonts.display)}', serif;`)
  }
  if (theme.fonts.ui !== DEFAULT_FONTS.ui) {
    lines.push(`--font-ui: '${clean(theme.fonts.ui)}', sans-serif;`)
  }

  return lines.length ? `:root { ${lines.join(' ')} }` : ''
}

/**
 * If the admins picked non-default fonts, build the Google Fonts
 * stylesheet URL that loads them. Returns null when defaults are
 * in use (those are already bundled with the site).
 */
export function googleFontsUrl(theme) {
  const families = []
  if (theme.fonts.display !== DEFAULT_FONTS.display) families.push(theme.fonts.display)
  if (theme.fonts.ui !== DEFAULT_FONTS.ui) families.push(theme.fonts.ui)
  if (families.length === 0) return null

  const parts = families.map(
    (f) => `family=${encodeURIComponent(f).replace(/%20/g, '+')}:ital,wght@0,300;0,400;0,500;1,300;1,400`
  )
  return `https://fonts.googleapis.com/css2?${parts.join('&')}&display=swap`
}
