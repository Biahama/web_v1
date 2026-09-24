// ============================================================
// ADMIN AREA SHELL — wraps every page under /admin
// ============================================================
// This is a SERVER component. Before anything renders it checks
// "is the logged-in person on the ADMIN_EMAILS list?" — if not,
// they are silently sent back to the homepage. Regular shoppers
// never even know /admin exists.
//
// The sidebar is a simple TREE that mirrors the storefront:
// each customer-facing page has its own edit screen. Children
// (like the four collection categories) are just indented links
// — no JavaScript, nothing to expand or collapse.
// ============================================================

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getAdminUser } from '@/lib/admin-auth'

// Always check the login fresh on every visit — never cache it.
export const dynamic = 'force-dynamic'

// The sidebar tree. 'children' links are indented under their parent.
const NAV_TREE = [
  {
    section: 'Storefront pages',
    links: [
      { href: '/admin/pages/landing', label: 'Landing page' },
      {
        href: '/admin/pages/collections',
        label: 'Collections',
        children: [
          { href: '/admin/pages/collections?cat=kurtas', label: 'Kurta' },
          { href: '/admin/pages/collections?cat=shirts', label: 'Shirts' },
          { href: '/admin/pages/collections?cat=tunics', label: 'Tunics' },
          { href: '/admin/pages/collections?cat=trousers', label: 'Pant' },
        ],
      },
      { href: '/admin/pages/pdp', label: 'Product page (PDP)' },
      { href: '/admin/pages/cart-checkout', label: 'Cart & Checkout' },
      { href: '/admin/pages/login', label: 'Login & Register' },
    ],
  },
  {
    section: 'Store',
    links: [
      { href: '/admin/products', label: 'Products' },
      { href: '/admin/orders', label: 'Orders' },
      { href: '/admin/coupons', label: 'Coupons' },
      { href: '/admin/analytics', label: 'Analytics' },
    ],
  },
  {
    section: 'Site',
    links: [
      { href: '/admin/theme', label: 'Global styles' },
      { href: '/admin/content', label: 'Content pages' },
      { href: '/admin/pages/store-settings', label: 'Store settings' },
      { href: '/admin', label: 'Errors' },
    ],
  },
]

// Shared look for every sidebar link.
const linkStyle = {
  color: '#ffffff',
  textDecoration: 'none',
  fontSize: 13,
  letterSpacing: '0.05em',
  padding: '6px 10px',
  borderRadius: 4,
  display: 'block',
}

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

        <nav>
          {NAV_TREE.map((group) => (
            <div key={group.section} style={{ marginBottom: 24 }}>
              {/* Small uppercase section label */}
              <div
                style={{
                  fontSize: 10,
                  letterSpacing: 2,
                  textTransform: 'uppercase',
                  color: '#9ca3af',
                  padding: '0 10px',
                  marginBottom: 6,
                }}
              >
                {group.section}
              </div>

              {group.links.map((link) => (
                <div key={link.href}>
                  <Link href={link.href} style={linkStyle}>
                    {link.label}
                  </Link>
                  {/* Indented children (e.g. the four collection categories) */}
                  {link.children?.map((child) => (
                    <Link
                      key={child.href}
                      href={child.href}
                      style={{ ...linkStyle, paddingLeft: 26, fontSize: 12, color: '#cbd5e0' }}
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              ))}
            </div>
          ))}

          {/* Quick jump back to the live shop */}
          <Link href="/" style={{ ...linkStyle, color: '#a0aec0' }}>
            View live site
          </Link>
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
