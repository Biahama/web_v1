import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import dotenv from 'dotenv'
import cloudinary from 'cloudinary'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '../.env.local') })

const { prisma } = await import('../lib/prisma.js')

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
})

const TUNICS = [
  {
    name: 'Grape Shake Passage Tunic',
    color: 'Grape Shake',
    colorHex: '#87677B',
    price: 285000,
    folderName: 'Grape Shake Passage Tunic'
  },
  {
    name: 'Navy Passage Linen Tunic',
    color: 'Navy',
    colorHex: '#1e293b',
    price: 305000,
    folderName: 'Navy Passage Linen Tunic'
  },
  {
    name: 'Sand Passage Linen Tunic',
    color: 'Sand',
    colorHex: '#d8cca5',
    price: 265000,
    folderName: 'Sand Passage Linen Tunic'
  }
]

const SIZES = ['S', 'M', 'L', 'XL', '2XL', '3XL']
const BASE_IMG_DIR = '/Users/soundariyanvenkatachalam/Desktop/Biahama/images and pdf/Tunic/'

async function uploadImage(filePath, publicId) {
  try {
    const res = await cloudinary.v2.uploader.upload(filePath, {
      public_id: publicId,
      folder: 'biahama/tunics',
      overwrite: true,
      format: 'webp',
      transformation: [
        { width: 800, height: 1200, crop: 'fill', gravity: 'auto' },
        { quality: 'auto:best', fetch_format: 'auto' }
      ]
    })
    return res.secure_url
  } catch (err) {
    console.error(`Failed to upload ${filePath}:`, err)
    return null
  }
}

async function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
}

async function main() {
  for (const tunic of TUNICS) {
    console.log(`Processing: ${tunic.name}...`)
    const slug = await slugify(tunic.name)

    // 1. Upload Images
    const imageUrls = []
    for (let i = 1; i <= 5; i++) {
      const imgPath = path.join(BASE_IMG_DIR, tunic.folderName, `${i}.png`)
      if (fs.existsSync(imgPath)) {
        console.log(`Uploading ${i}.png...`)
        const url = await uploadImage(imgPath, `${slug}-${i}`)
        if (url) {
          imageUrls.push({
            url: url,
            altText: `${tunic.name} - View ${i}`,
            isPrimary: i === 1,
            sortOrder: i
          })
        }
      } else {
        console.warn(`File not found: ${imgPath}`)
      }
    }

    console.log(`Saving ${tunic.name} to database using Prisma...`)
    
    const existing = await prisma.product.findUnique({ where: { slug } })
    if (existing) {
      console.log(`Deleting existing product...`)
      await prisma.product.delete({ where: { id: existing.id } })
    }

    const product = await prisma.product.create({
      data: {
        name: tunic.name,
        slug: slug,
        description: `Experience effortless style with the ${tunic.name.toLowerCase()}. Crafted from premium natural linen, it offers unparalleled breathability and a relaxed, flowing silhouette that flatters every form.`,
        category: 'tunics',
        fabric: '100% Premium Organic Indian Linen',
        care: 'Hand wash cold or dry clean. Do not bleach. Dry flat in shade. Iron medium heat.',
        isActive: true,
        images: {
          create: imageUrls
        },
        variants: {
          create: SIZES.map(size => ({
            sku: `BIA-TNC-${slug.split('-')[0].toUpperCase()}-${size}`,
            size: size,
            color: tunic.color,
            colorHex: tunic.colorHex,
            stockQty: 10,
            price: tunic.price,
            comparePrice: tunic.price + 50000
          }))
        }
      }
    })

    console.log(`Successfully created ${tunic.name} (ID: ${product.id}) with ${imageUrls.length} images and ${SIZES.length} variants!`)
  }
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    try { await prisma.$disconnect() } catch (e) {}
  })
