// ============================================================
// CART & CHECKOUT EDITOR (server side)
// ============================================================
// Thin server page: hands the commerce defaults to the
// interactive editor. Same pattern as admin/theme/page.jsx.
// ============================================================

import { DEFAULT_COMMERCE } from '@/lib/site-settings'
import CartCheckoutEditor from './CartCheckoutEditor'

export const dynamic = 'force-dynamic'

export default function CartCheckoutAdminPage() {
  return <CartCheckoutEditor defaultCommerce={DEFAULT_COMMERCE} />
}
