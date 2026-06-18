import fs from 'fs'
import path from 'path'

export function getKurtasFromFilesystem() {
  const kurtaDir = path.join(process.cwd(), 'public/images/KURTA')
  if (!fs.existsSync(kurtaDir)) {
    return []
  }

  const folders = fs.readdirSync(kurtaDir).filter(f => {
    return fs.statSync(path.join(kurtaDir, f)).isDirectory()
  })

  // Keep folders in a stable sorted order
  folders.sort()

  return folders.map((folderName, index) => {
    const productPath = path.join(kurtaDir, folderName)
    const files = fs.readdirSync(productPath)
      .filter(file => /\.(png|jpe?g|webp)$/i.test(file))
      
    // Sort files numerically by name (e.g. 1.png, 2.png)
    files.sort((a, b) => {
      const numA = parseInt(a) || 0
      const numB = parseInt(b) || 0
      return numA - numB
    })

    const imageUrls = files.map(file => `/images/KURTA/${folderName}/${file}`)
    const slug = folderName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')

    // Derive color name (first two words if Grape shake, else first word)
    let colorName = folderName.split(' ')[0]
    if (folderName.toLowerCase().startsWith('grape shake')) {
      colorName = 'Grape shake'
    }

    // Stable price in paise
    let price = 245000 + (index * 20000)

    // S-3XL Variants
    const sizes = ['S', 'M', 'L', 'XL', '2XL', '3XL']
    const variants = sizes.map((size, sIdx) => {
      const variantId = `var-kurta-${slug}-${size.toLowerCase()}`
      const stockQty = (sIdx === 4) ? 0 : 5 // Make 2XL out of stock
      return {
        id: variantId,
        size,
        color: colorName,
        colorHex: getColorHex(colorName),
        stockQty,
        sku: `BIA-KRT-${slug.slice(0, 4).toUpperCase()}-${size}`,
        price: price,
        comparePrice: price + 50000
      }
    })

    const inStock = variants.some(v => v.stockQty > 0)
    const firstInStockVariant = variants.find(v => v.stockQty > 0) || variants[0]

    // Description & details
    const isKurti = folderName.toLowerCase().includes('kurti')
    const typeLabel = isKurti ? 'kurti' : 'kurta'
    const description = `Crafted from 100% organic hand-spun Indian linen, this ${typeLabel} features our signature relaxed fit, structured lines, and understated elegance. Ideal for lightweight layering and year-round breathability.`

    return {
      id: `kurta-${slug}`,
      name: folderName,
      slug,
      description,
      category: 'Kurta',
      fabric: '100% Premium Organic Indian Linen',
      care: 'Hand wash cold or dry clean. Do not bleach. Dry flat in shade. Iron medium heat.',
      image: imageUrls[0] || null,
      images: imageUrls.map(url => ({ url, altText: folderName })),
      altText: folderName,
      price: price,
      inStock,
      firstVariantId: firstInStockVariant.id,
      variants,
      colors: [{ color: colorName, colorHex: getColorHex(colorName) }]
    }
  })
}

export function getKurtaBySlug(slug) {
  const kurtas = getKurtasFromFilesystem()
  return kurtas.find(k => k.slug === slug) || null
}

function getColorHex(colorName) {
  const hexes = {
    'Grape shake': '#5b4a58',
    'Navy': '#1e2d42',
    'Oak': '#9e7e5d',
    'Purple': '#4b2c5c',
    'Sage': '#828e84',
    'Sand': '#d5cbb8'
  }
  return hexes[colorName] || '#d2b48c'
}
