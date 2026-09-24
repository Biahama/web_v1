'use client'

// ============================================================
// PAGE VIEW TRACKER — an invisible component that sits in the
// site layout and quietly counts one "page view" every time
// the shopper moves to a new page. Shows nothing on screen.
// ============================================================

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { trackEvent } from '@/lib/analytics-client'

export default function PageViewTracker() {
  const pathname = usePathname()

  useEffect(() => {
    if (!pathname) return
    // Don't count ourselves — visits to the admin panel are
    // you two, not customers.
    if (pathname.startsWith('/admin')) return
    trackEvent('page_view', { path: pathname })
  }, [pathname])

  return null
}
