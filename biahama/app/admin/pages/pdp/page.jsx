// ============================================================
// PRODUCT PAGE (PDP) EDITOR (server side)
// ============================================================
// Thin server page: hands the product-page defaults to the
// interactive editor. Same pattern as admin/theme/page.jsx.
// ============================================================

import { DEFAULT_PDP } from '@/lib/site-settings'
import PdpEditor from './PdpEditor'

export const dynamic = 'force-dynamic'

export default function PdpAdminPage() {
  return <PdpEditor defaultPdp={DEFAULT_PDP} />
}
