import { revalidatePath } from 'next/cache'

export function revalidateCatalog(slug) {
  revalidatePath('/')
  revalidatePath('/shop')
  revalidatePath('/sitemap.xml')
  if (slug) revalidatePath(`/products/${slug}`)
  else revalidatePath('/products/[slug]', 'page')
}
