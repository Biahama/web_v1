'use client'

// ============================================================
// MAIN SITE CHROME (browser side)
// ============================================================
// The bar/nav/footer frame around every shop page. It lives in
// its own client component because it needs to know the current
// URL (the homepage gets no top padding — the hero photo starts
// at the very top). The settings values come in as props from
// the server layout, which read them from the database.
// ============================================================

import AnnouncementBar from '@/components/layout/AnnouncementBar'
import { useCart } from '@/lib/cart'
import { useWardrobe } from '@/lib/wardrobe'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { usePathname } from 'next/navigation'

export default function MainChrome({ showAnnouncementBar, announcementText, children }) {
  const pathname = usePathname()
  const isHome = pathname === '/'
  const { error: cartError } = useCart()
  const { error: wardrobeError } = useWardrobe()
  const error = cartError || wardrobeError
  const announcement = showAnnouncementBar && !isHome && pathname !== '/checkout'

  return (
    <div className="flex flex-col min-h-screen">
      {/* The admin can switch the announcement bar off entirely. */}
      {announcement && <AnnouncementBar text={announcementText} />}
      <Navbar />
      <main className="flex-1" style={{ paddingTop: isHome || announcement ? 0 : '56px' }}>
        {error && <div className="cart-error" role="alert">{error}</div>}
        {children}
      </main>
      <Footer />
    </div>
  )
}
