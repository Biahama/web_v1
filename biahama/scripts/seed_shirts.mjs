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

const SHIRTS = [
  {
    name: 'Navy Linen Column Shirt',
    color: 'Navy',
    colorHex: '#1e293b',
    price: 310000,
    folderName: 'Navy Linen Column shirt'
  },
  {
    name: 'Petrified Oak Linen Column Shirt',
    color: 'Petrified Oak',
    colorHex: '#5c544d',
    price: 320000,
    folderName: 'Petrified Oak Linen Column Shirt'
  },
  {
    name: 'Sage Linen Column Shirt',
    color: 'Sage',
    colorHex: '#8e9e8f',
    price: 295000,
    folderName: 'Sage Linen Column Shirt'
  }
]

const SIZES = ['S', 'M', 'L', 'XL', '2XL', '3XL']
const BASE_IMG_DIR = '/Users/soundariyanvenkatachalam/Desktop/Biahama/images and pdf/shirt/'

async function uploadImage(filePath, publicId) {
  try {
    const res = await cloudinary.v2.uploader.upload(filePath, {
      public_id: publicId,
      folder: 'biahama/shirts',
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
  for (const shirt of SHIRTS) {
    console.log(`Processing: ${shirt.name}...`)
    const slug = await slugify(shirt.name)

    // 1. Upload Images
    const imageUrls = []
    for (let i = 1; i <= 5; i++) {
      const imgPath = path.join(BASE_IMG_DIR, shirt.folderName, `${i}.png`)
      if (fs.existsSync(imgPath)) {
        console.log(`Uploading ${i}.png...`)
        const url = await uploadImage(imgPath, `${slug}-${i}`)
        if (url) {
          imageUrls.push({
            url: url,
            altText: `${shirt.name} - View ${i}`,
            isPrimary: i === 1,
            sortOrder: i
          })
        }
      } else {
        console.warn(`File not found: ${imgPath}`)
      }
    }

    console.log(`Saving ${shirt.name} to database using Prisma...`)
    
    const existing = await prisma.product.findUnique({ where: { slug } })
    if (existing) {
      console.log(`Deleting existing product...`)
      await prisma.product.delete({ where: { id: existing.id } })
    }

    const product = await prisma.product.create({
      data: {
        name: shirt.name,
        slug: slug,
        description: `Crafted from 100% organic hand-spun Indian linen, this ${shirt.name.toLowerCase()} features our signature relaxed fit, structured lines, and understated elegance. Ideal for lightweight layering and year-round breathability.`,
        category: 'shirts',
        fabric: '100% Premium Organic Indian Linen',
        care: 'Hand wash cold or dry clean. Do not bleach. Dry flat in shade. Iron medium heat.',
        isActive: true,
        images: {
          create: imageUrls
        },
        variants: {
          create: SIZES.map(size => ({
            sku: `BIA-SHRT-${slug.split('-')[0].toUpperCase()}-${size}`,
            size: size,
            color: shirt.color,
            colorHex: shirt.colorHex,
            stockQty: 10,
            price: shirt.price,
            comparePrice: shirt.price + 50000
          }))
        }
      }
    })

    console.log(`Successfully created ${shirt.name} (ID: ${product.id}) with ${imageUrls.length} images and ${SIZES.length} variants!`)
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
