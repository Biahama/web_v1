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
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { usePathname } from 'next/navigation'

export default function MainChrome({ showAnnouncementBar, announcementText, children }) {
  const pathname = usePathname()
  const isHome = pathname === '/'

  return (
    <div className="flex flex-col min-h-screen">
      {/* The admin can switch the announcement bar off entirely. */}
      {showAnnouncementBar && <AnnouncementBar text={announcementText} />}
      <Navbar />
      <main className="flex-1" style={{ paddingTop: isHome ? 0 : '56px' }}>
        {children}
      </main>
      <Footer />
    </div>
  )
}
