'use client'

import AnnouncementBar from '@/components/layout/AnnouncementBar'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { usePathname } from 'next/navigation'

export default function MainLayout({ children }) {
  const pathname = usePathname()
  const isHome = pathname === '/'

  return (
    <div className="flex flex-col min-h-screen">
      <AnnouncementBar />
      <Navbar />
      <main className="flex-1" style={{ paddingTop: isHome ? 0 : '56px' }}>
        {children}
      </main>
      <Footer />
    </div>
  )
}
