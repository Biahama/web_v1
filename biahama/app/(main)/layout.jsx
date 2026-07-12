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

export default async function MainLayout({ children }) {
  const settings = await getSiteSettings()

  return (
    <MainChrome
      showAnnouncementBar={settings.layout.showAnnouncementBar}
      announcementText={settings.layout.announcementText}
    >
      {children}
    </MainChrome>
  )
}
