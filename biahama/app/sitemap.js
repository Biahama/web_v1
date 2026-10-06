import { prisma } from '@/lib/prisma'
import { CONTENT_SLUGS } from '@/lib/content-pages'
export const revalidate = 3600
export default async function sitemap() {
  const origin = 'https://www.biahama.com'
  const products = await prisma.product.findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true, images: { select: { url: true } } } })
  return [
    { url: origin, changeFrequency: 'weekly', priority: 1 },
    ...['kurtas', 'shirts', 'tunics', 'trousers'].map(category => ({ url: `${origin}/shop?cat=${category}`, changeFrequency: 'weekly', priority: 0.8 })),
    ...CONTENT_SLUGS.map(slug => ({ url: `${origin}/${slug}`, changeFrequency: 'monthly', priority: 0.4 })),
    ...products.map(product => ({ url: `${origin}/products/${product.slug}`, lastModified: product.updatedAt, images: product.images.map(image => image.url), changeFrequency: 'weekly', priority: 0.7 })),
  ]
}
