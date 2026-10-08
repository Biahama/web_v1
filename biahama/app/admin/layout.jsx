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
// with a collapsible menu on mobile.
// ============================================================

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getAdminUser } from '@/lib/admin-auth'
import AdminNav from '@/components/admin/AdminNav'

// Always check the login fresh on every visit — never cache it.
export const dynamic = 'force-dynamic'
export const metadata = { robots: { index: false, follow: false } }

// The sidebar tree. 'children' links are indented under their parent.
const NAV_TREE = [
  { section: 'Overview', links: [{ href: '/admin', label: 'Dashboard' }] },
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
      { href: '/admin/inventory', label: 'Inventory' },
      { href: '/admin/customers', label: 'Customers' },
      { href: '/admin/returns', label: 'Returns & exchanges' },
      { href: '/admin/operations', label: 'Operations & recovery' },
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
      { href: '/admin#errors', label: 'Technical errors' },
    ],
  },
]

export default async function AdminLayout({ children }) {
  // Gate: only people on the ADMIN_EMAILS list may enter.
  const admin = await getAdminUser()
  if (!admin) redirect('/')

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Link href="/admin" className="admin-brand">BIAHAMA<span>Store administration</span></Link>
        <AdminNav groups={[NAV_TREE[0], NAV_TREE[2], NAV_TREE[1], NAV_TREE[3]]} />
        <p className="admin-signed-in">Signed in as<br />{admin.email}</p>
      </aside>
      <main className="admin-main">{children}</main>
    </div>
  )
}
