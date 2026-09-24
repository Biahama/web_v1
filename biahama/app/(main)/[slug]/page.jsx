// ============================================================
// PUBLIC CONTENT PAGE — /about, /shipping, /returns, etc.
// ============================================================
// One file renders all the "words" pages. Only the slugs listed
// in lib/content-pages.js are allowed — anything else shows the
// normal 404 page. (Real routes like /shop have their own files,
// and Next.js always prefers those over this catch-all.)
//
// Text priority: your edits in the ContentPage table first,
// the built-in defaults second. If the database is unreachable
// the default text shows and the error is logged — the page
// never crashes.
// ============================================================

import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { logError } from '@/lib/logger'
import { DEFAULT_PAGES } from '@/lib/content-pages'

// Re-check the database at most once an hour (saving in the
// admin panel refreshes the page immediately anyway).
export const revalidate = 3600

// Load the page text: database version if edited, else default.
async function getPage(slug) {
  const fallback = DEFAULT_PAGES[slug]
  if (!fallback) return null

  try {
    const row = await prisma.contentPage.findUnique({ where: { slug } })
    if (row) return { title: row.title, body: row.body }
  } catch (error) {
    await logError('content page — load', error, { slug })
  }
  return fallback
}

// Browser tab title, e.g. "Shipping — Biahama"
export async function generateMetadata({ params }) {
  const { slug } = await params
  const page = await getPage(slug)
  if (!page) return { title: 'Not found — Biahama' }
  return { title: `${page.title} — Biahama` }
}

export default async function ContentPage({ params }) {
  const { slug } = await params
  const page = await getPage(slug)
  if (!page) notFound()

  // Blank lines in the saved text become paragraph breaks.
  const paragraphs = page.body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)

  return (
    <div
      style={{
        maxWidth: '680px',
        margin: '0 auto',
        // Extra top space so the fixed 56px navbar never overlaps the title.
        padding: '140px 24px 96px',
      }}
    >
      <h1
        style={{
          fontFamily: 'var(--font-display)',
          fontStyle: 'italic',
          fontWeight: 300,
          fontSize: '36px',
          textAlign: 'center',
          color: '#1A202C',
          marginBottom: '48px',
        }}
      >
        {page.title}
      </h1>

      {paragraphs.map((text, i) => (
        <p
          key={i}
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize: '14px',
            lineHeight: 1.9,
            color: '#404040',
            marginBottom: '24px',
          }}
        >
          {text}
        </p>
      ))}
    </div>
  )
}
