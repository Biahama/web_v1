// ============================================================
// ONE-OFF: REPLACE PRODUCT NAMES + PHOTOS WITH THE ORIGINALS
// ============================================================
// Each existing listing is renamed to its folder name in
// "images and pdf/original images", moved to the right
// collection, and its photos swapped for the originals.
// Product ids, variants (stock), orders and reviews are kept.
// Old Cloudinary photos are deleted after the swap.
//
//   node scripts/replace_product_photos.mjs          (dry run)
//   node scripts/replace_product_photos.mjs --apply  (do it)
// ============================================================

import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import cloudinary from 'cloudinary'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../.env.local'), quiet: true })
const { prisma } = await import('../lib/prisma.js')

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
})

const APPLY = process.argv.includes('--apply')
const SRC = '/Users/soundariyanvenkatachalam/Desktop/Biahama/images and pdf/original images'

const HEX = { Beige: '#d5cbb8', Green: '#8a8f5c', Pink: '#9a6468', Navy: '#1e2d42', Oak: '#9e7e5d' }
const CAT = {
  Kurta: { category: 'Kurta', folder: 'kurtas' },
  Tunic: { category: 'tunics', folder: 'tunics' },
  Pant: { category: 'trousers', folder: 'pants' }
}

// [old listing name, photo folder, new name, collection]
const MAP = [
  ['Sand A-line Linen Kurti', 'Beige A line Kurta', 'Beige A-Line Kurta', 'Kurta'],
  ['Navy A-line Linen Kurti', 'Navy A line Kurta', 'Navy A-Line Kurta', 'Kurta'],
  ['Oak A-line Linen Kurti', 'Oak A line Kurta', 'Oak A-Line Kurta', 'Kurta'],
  ['Purple A-line Linen Kurti', 'Pink A- Line Kurta', 'Pink A-Line Kurta', 'Kurta'],
  ['Sand Solid Long Linen Kurti', 'Beige long kurta', 'Beige Long Kurta', 'Kurta'],
  ['Sage Solid Long Linen Kurti', 'Green Long Kurta', 'Green Long Kurta', 'Kurta'],
  ['Sage Pin Tuck Linen Kurta', 'Green Pleated Kurta', 'Green Pleated Kurta', 'Kurta'],
  ['Navy Pin Tuck Linen Kurta', 'Navy Pleated Kurta', 'Navy Pleated Kurta', 'Kurta'],
  ['Oak Pin Tuck Linen Kurta', 'Oak Pleated Kurta', 'Oak Pleated Kurta', 'Kurta'],
  ['Grape Shake Pin Tuck Linen Kurta', 'Pink Pleated Kurta', 'Pink Pleated Kurta', 'Kurta'],
  ['Sand Passage Linen Tunic', 'Beige V Neck Tunic', 'Beige V-Neck Tunic', 'Tunic'],
  ['Navy Passage Linen Tunic', 'Navy V Neck Tunic', 'Navy V-Neck Tunic', 'Tunic'],
  ['Grape Shake Passage Tunic', 'Pink V neck Tunic', 'Pink V-Neck Tunic', 'Tunic'],
  ['Sage Linen Column Shirt', 'Green Collar Tunic', 'Green Collar Tunic', 'Tunic'],
  ['Navy Linen Column Shirt', 'Navy Collar Tunic', 'Navy Collar Tunic', 'Tunic'],
  ['Petrified Oak Linen Column Shirt', 'Oak Collar Tunic', 'Oak Collar Tunic', 'Tunic'],
  ['Sand Linen Column Trouser', 'Beige Straight Pant', 'Beige Straight Pant', 'Pant'],
  ['Sage Linen Column Trouser', 'Green Straight Pant', 'Green Straight Pant', 'Pant'],
  ['Navy Linen Column Trouser', 'Navy Straight Pant', 'Navy Straight Pant', 'Pant'],
  ['Oak Linen Column Trouser', 'Oak Straight Pant', 'Oak Straight Pant', 'Pant'],
  ['Grape Shake Linen Column Trouser', 'Pink Straight pant', 'Pink Straight Pant', 'Pant'],
  ['Sage Volume Trouser', 'Green Semi Palazzo Pant', 'Green Semi Palazzo Pant', 'Pant'],
  ['Navy Volume Trouser', 'Navy Semi Palazzo Pant', 'Navy Semi Palazzo Pant', 'Pant'],
  ['Petrified Oak Volume Trouser', 'Oak Semi Palazzo Pant', 'Oak Semi Palazzo Pant', 'Pant'],
  ['Grape Shake Volume Trouser', 'Pink Semi Palazzo Pant', 'Pink Semi Palazzo Pant', 'Pant'],
]
// No original photos for this one — hidden from the shop, not deleted (orders may point at it)
const HIDE = ['Sand Volume Trouser']

const slugify = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
// https://res.cloudinary.com/x/image/upload/v123/biahama/kurtas/foo-1.webp -> biahama/kurtas/foo-1
const publicIdOf = url => url.match(/\/upload\/(?:v\d+\/)?(.+)\.\w+$/)?.[1]

const oldPublicIds = []

for (const [oldName, folder, newName, kind] of MAP) {
  const product = await prisma.product.findFirst({ where: { name: oldName }, include: { images: true } })
  if (!product) throw new Error(`Listing not found: ${oldName}`)
  const dir = path.join(SRC, folder)
  const files = fs.readdirSync(dir).filter(f => /\.jpe?g$/i.test(f)).sort()
  if (!files.length) throw new Error(`No photos in ${folder}`)
  const { category, folder: cloudFolder } = CAT[kind]
  const color = newName.split(' ')[0]
  const slug = slugify(newName)
  console.log(`${oldName}  ->  ${newName}  [${category}, ${color}]  ${files.length} photos`)
  if (!APPLY) continue

  const urls = []
  for (const [i, f] of files.entries()) {
    const res = await cloudinary.v2.uploader.upload(path.join(dir, f), {
      public_id: `${slug}-${i + 1}`,
      folder: `biahama/${cloudFolder}`,
      overwrite: true,
      format: 'webp',
      transformation: [
        { width: 800, height: 1200, crop: 'fill', gravity: 'auto' },
        { quality: 'auto:best', fetch_format: 'auto' }
      ]
    })
    urls.push(res.secure_url)
  }

  await prisma.$transaction([
    prisma.product.update({
      where: { id: product.id },
      data: {
        name: newName,
        slug,
        category,
        description: product.description?.replaceAll(oldName, newName),
        metaTitle: product.metaTitle?.replaceAll(oldName, newName)
      }
    }),
    prisma.productVariant.updateMany({ where: { productId: product.id }, data: { color, colorHex: HEX[color] } }),
    prisma.productImage.deleteMany({ where: { productId: product.id } }),
    prisma.productImage.createMany({
      data: urls.map((url, i) => ({ productId: product.id, url, altText: newName, sortOrder: i, isPrimary: i === 0 }))
    })
  ])
  oldPublicIds.push(...product.images.map(img => publicIdOf(img.url)).filter(Boolean))
}

for (const name of HIDE) {
  console.log(`${name}  ->  hidden (no original photos)`)
  if (APPLY) await prisma.product.updateMany({ where: { name }, data: { isActive: false } })
}

if (APPLY) {
  // Don't delete anything we just uploaded under the same public id
  const kept = new Set((await prisma.productImage.findMany({ select: { url: true } })).map(i => publicIdOf(i.url)))
  const toDelete = [...new Set(oldPublicIds)].filter(id => !kept.has(id))
  for (let i = 0; i < toDelete.length; i += 100) {
    await cloudinary.v2.api.delete_resources(toDelete.slice(i, i + 100))
  }
  console.log(`Deleted ${toDelete.length} old Cloudinary photos`)
}

await prisma.$disconnect()
