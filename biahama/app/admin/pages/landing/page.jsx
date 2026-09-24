// ============================================================
// LANDING PAGE EDITOR (server side)
// ============================================================
// Thin server page: it hands the landing-page defaults to the
// interactive editor. Same pattern as admin/theme/page.jsx.
// ============================================================

import { DEFAULT_LAYOUT } from '@/lib/site-settings'
import LandingEditor from './LandingEditor'

export const dynamic = 'force-dynamic'

export default function LandingAdminPage() {
  return <LandingEditor defaultLayout={DEFAULT_LAYOUT} />
}
