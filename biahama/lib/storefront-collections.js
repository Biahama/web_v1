import { cache } from 'react'
import { prisma } from './prisma'
import { publishedCollections } from './collections'
import { logError } from './logger'

// Shared by the homepage, navigation and collection tabs within a render.
// Stock of zero still means a published collection; no products means hidden.
export const getStorefrontCollections = cache(async () => {
  try {
    const categories = await prisma.product.groupBy({
      by: ['category'],
      where: { isActive: true, variants: { some: { price: { gt: 0 } } } },
    })
    return publishedCollections(categories.map(row => row.category))
  } catch (error) {
    await logError('storefront collections', error)
    return []
  }
})
