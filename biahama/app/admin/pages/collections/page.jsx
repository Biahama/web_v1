// ============================================================
// COLLECTION PAGES EDITOR (server side)
// ============================================================
// Thin server page: reads which category tab is open (?cat=...)
// and hands it, plus the defaults, to the interactive editor.
// ============================================================

import { DEFAULT_COLLECTIONS } from '@/lib/site-settings'
import CollectionsEditor from './CollectionsEditor'

export const dynamic = 'force-dynamic'

export default async function CollectionsAdminPage({ searchParams }) {
  const params = await searchParams
  // Only the four real categories are allowed; anything else -> kurtas.
  const cat = Object.keys(DEFAULT_COLLECTIONS).includes(params?.cat)
    ? params.cat
    : 'kurtas'

  return <CollectionsEditor cat={cat} defaultCollections={DEFAULT_COLLECTIONS} />
}
