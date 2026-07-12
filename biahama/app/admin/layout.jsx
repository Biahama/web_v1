// ============================================================
// ADMIN AREA SHELL — wraps every page under /admin
// ============================================================
// This is a SERVER component. Before anything renders it checks
// "is the logged-in person on the ADMIN_EMAILS list?" — if not,
// they are silently sent back to the homepage. Regular shoppers
// never even know /admin exists.
// ============================================================

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getAdminUser } from '@/lib/admin-auth'

// Always check the login fresh on every visit — never cache it.
export const dynamic = 'force-dynamic'

// The links shown in the left sidebar.
const NAV_LINKS = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/products', label: 'Products' },
  { href: '/admin/theme', label: 'Theme & Layout' },
  { href: '/admin/content', label: 'Pages' },
  { href: '/', label: 'View Site' },
]

export default async function AdminLayout({ children }) {
  // Gate: only people on the ADMIN_EMAILS list may enter.
  const admin = await getAdminUser()
  if (!admin) redirect('/')

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'var(--font-ui), Jost, sans-serif' }}>
      {/* ---- Left sidebar ---- */}
      <aside
        style={{
          width: 220,
          flexShrink: 0,
          background: '#1A202C',
          color: '#ffffff',
          padding: '24px 16px',
        }}
      >
        <div
          style={{
            fontSize: 14,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            marginBottom: 4,
          }}
        >
          Biahama
        </div>
        <div style={{ fontSize: 11, color: '#a0aec0', marginBottom: 28 }}>Admin panel</div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              style={{
                color: '#ffffff',
                textDecoration: 'none',
                fontSize: 13,
                letterSpacing: '0.05em',
                padding: '8px 10px',
                borderRadius: 4,
              }}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Who is logged in — handy when both brothers share a laptop. */}
        <div style={{ marginTop: 40, fontSize: 11, color: '#718096', wordBreak: 'break-all' }}>
          Signed in as
          <br />
          {admin.email}
        </div>
      </aside>

      {/* ---- Main content area ---- */}
      <main style={{ flex: 1, background: '#ffffff', padding: 32, minWidth: 0 }}>
        {children}
      </main>
    </div>
  )
}
