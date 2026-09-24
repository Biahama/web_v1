// ============================================================
// STORE SETTINGS EDITOR (server side)
// ============================================================
// Thin server page: hands the commerce defaults to the
// interactive editor. Same pattern as admin/theme/page.jsx.
// ============================================================

import { DEFAULT_COMMERCE } from '@/lib/site-settings'
import StoreSettingsEditor from './StoreSettingsEditor'

export const dynamic = 'force-dynamic'

export default function StoreSettingsAdminPage() {
  return <StoreSettingsEditor defaultCommerce={DEFAULT_COMMERCE} />
}
