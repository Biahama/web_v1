// ============================================================
// /admin/products/new — add a product to the shop
// ============================================================
// Just shows the empty product form. After the first save you
// land on the edit page, where photos can be added.
// ============================================================

import ProductForm from '../ProductForm'

// Always render fresh — no caching for admin pages.
export const dynamic = 'force-dynamic'

export default function NewProductPage() {
  return <ProductForm />
}
