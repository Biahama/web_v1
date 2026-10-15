// ============================================================
// MAIN SITE LAYOUT (server side)
// ============================================================
// Reads the admin's saved settings (announcement bar on/off and
// its text) and hands them to the browser-side frame below.
// getSiteSettings is crash-safe: if the database is unreachable
// the site quietly uses its built-in defaults.
// ============================================================

import { getSiteSettings } from '@/lib/site-settings'
import MainChrome from '@/components/layout/MainChrome'
import { getStorefrontCollections } from '@/lib/storefront-collections'

export default async function MainLayout({ children }) {
  const [settings, collections] = await Promise.all([getSiteSettings(), getStorefrontCollections()])

  return (
    <MainChrome
      collections={collections}
      showAnnouncementBar={settings.layout.showAnnouncementBar}
      announcementText={settings.layout.announcementText}
    >
      {children}
    </MainChrome>
  )
}
