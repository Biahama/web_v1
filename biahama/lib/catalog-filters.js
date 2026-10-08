export function filterCatalog(products, filters) {
  const matches = products.filter(product => product.variants.some(variant =>
    (!filters.size || variant.size === filters.size) &&
    (!filters.color || variant.color === filters.color) &&
    (filters.availability !== 'in-stock' || variant.stockQty > 0)
  ))
  if (filters.sort === 'price-asc') return matches.sort((a, b) => a.price - b.price)
  if (filters.sort === 'price-desc') return matches.sort((a, b) => b.price - a.price)
  if (filters.sort === 'name') return matches.sort((a, b) => a.name.localeCompare(b.name))
  return matches
}
