import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import ProductDetailClient from '@/components/product/ProductDetailClient'

function getMockProduct(slug) {
  const parts = slug.split('-')
  const categorySlug = parts[1] || 'kurtas'
  const index = parseInt(parts[2] || '1') || 1

  const titles = {
    kurtas: ['Ivory Linen Kurta', 'Sand Tunic Dress', 'Natural Linen Set', 'Stone Wrap Shirt', 'Ecru Wide Trousers', 'Oat Linen Jacket', 'Fluid Wrap Kurta', 'Architectural Linen Tunic', 'COS Style Kurta', 'Classic Linen Trousers'],
    shirts: ['Stone Wrap Shirt', 'Classic White Linen Shirt', 'Relaxed Fit Linen Shirt'],
    tunics: ['Sand Tunic Dress', 'Architectural Linen Tunic', 'Oat Tunic Coat'],
    trousers: ['Ecru Wide Trousers', 'Classic Linen Trousers', 'Sand Linen Pants', 'Natural Linen Shorts', 'Crop Linen Pants', 'Flowing White Trouser', 'Loose Linen Pant', 'Belted Linen Trouser', 'Pleated Sand Trousers', 'Tailored Linen Pants']
  }

  const category = (categorySlug === 'trousers' || categorySlug === 'pant' || categorySlug === 'pants') ? 'trousers' : categorySlug
  const activeTitles = titles[category] || titles['kurtas']
  const name = activeTitles[(index - 1) % activeTitles.length] || 'Linen Garment'
  
  const categoryName = category === 'trousers' ? 'Pant' : category.charAt(0).toUpperCase() + category.slice(1, -1)

  return {
    id: `mock-${slug}`,
    name,
    slug,
    description: `Crafted from 100% organic hand-spun Indian linen, this ${categoryName.toLowerCase()} features our signature relaxed fit, structured lines, and understated elegance. Ideal for lightweight layering and year-round breathability.`,
    category: categoryName,
    fabric: '100% Premium Organic Indian Linen',
    care: 'Hand wash cold or dry clean. Do not bleach. Dry flat in shade. Iron medium heat.',
    isActive: true,
    images: [
      { url: 'https://images.unsplash.com/photo-1609357605129-26f69add5d6e?auto=format&fit=crop&w=600&h=800&q=80' },
      { url: 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=600&h=800&q=80' },
      { url: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&w=600&h=800&q=80' },
      { url: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=600&h=800&q=80' },
      { url: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=600&h=800&q=80' },
      { url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=600&h=800&q=80' },
    ],
    variants: [
      { id: `mock-var-${slug}-s`, size: 'S', color: 'Natural Linen', colorHex: '#d2b48c', stockQty: 5, price: 245000 + index * 20000, sku: `BIA-${category.toUpperCase()}-S` },
      { id: `mock-var-${slug}-m`, size: 'M', color: 'Natural Linen', colorHex: '#d2b48c', stockQty: 5, price: 245000 + index * 20000, sku: `BIA-${category.toUpperCase()}-M` },
      { id: `mock-var-${slug}-l`, size: 'L', color: 'Natural Linen', colorHex: '#d2b48c', stockQty: 3, price: 245000 + index * 20000, sku: `BIA-${category.toUpperCase()}-L` },
      { id: `mock-var-${slug}-xl`, size: 'XL', color: 'Natural Linen', colorHex: '#d2b48c', stockQty: 5, price: 245000 + index * 20000, sku: `BIA-${category.toUpperCase()}-XL` },
      { id: `mock-var-${slug}-2xl`, size: '2XL', color: 'Natural Linen', colorHex: '#d2b48c', stockQty: 0, price: 245000 + index * 20000, sku: `BIA-${category.toUpperCase()}-2XL` },
      { id: `mock-var-${slug}-3xl`, size: '3XL', color: 'Natural Linen', colorHex: '#d2b48c', stockQty: 5, price: 245000 + index * 20000, sku: `BIA-${category.toUpperCase()}-3XL` },
    ]
  }
}

export async function generateMetadata({ params }) {
  const { slug } = await params

  if (slug.startsWith('mock-')) {
    const product = getMockProduct(slug)
    return {
      title: `${product.name} | Biahama`,
      description: product.description,
    }
  }

  let product = null
  try {
    product = await prisma.product.findUnique({
      where: { slug }
    })
  } catch (err) {
    console.error("Metadata generation database query failed:", err)
  }

  if (!product) {
    const mock = getMockProduct(slug)
    return {
      title: `${mock.name} | Biahama`,
      description: mock.description,
    }
  }

  return {
    title: `${product.name} | Biahama`,
    description: product.description || 'Luxury Linen crafted in India.',
  }
}

export default async function ProductDetailPage({ params }) {
  const { slug } = await params

  if (slug.startsWith('mock-')) {
    const product = getMockProduct(slug)
    return <ProductDetailClient product={product} />
  }

  let product = null
  try {
    product = await prisma.product.findUnique({
      where: { slug },
      include: {
        images:   { orderBy: { sortOrder: 'asc' } },
        variants: { orderBy: { size: 'asc' } },
      },
    })
  } catch (err) {
    console.error("Product detail database query failed:", err)
  }

  if (!product) {
    const mock = getMockProduct(slug)
    return <ProductDetailClient product={mock} />
  }

  return <ProductDetailClient product={product} />
}
