import Fuse from 'fuse.js'

export const fuseOptions = {
  keys: ['name', 'description', 'category'],
  threshold: 0.3,
  includeScore: true,
}

export function createFuseIndex(products) {
  return new Fuse(products, fuseOptions)
}
