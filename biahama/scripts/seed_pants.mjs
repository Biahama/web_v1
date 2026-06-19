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

const PANTS = [
  // PALAZZO PANTS
  {
    name: 'Grape Shake Volume Trouser',
    color: 'Grape Shake',
    colorHex: '#87677B',
    price: 245000,
    folderPath: 'palazo pant/Grape shake Volume Trouser',
    description: 'A relaxed, wide-leg palazzo trouser crafted from breathable Indian linen. The Grape Shake Volume Trouser perfectly balances effortless comfort with structured elegance.'
  },
  {
    name: 'Navy Volume Trouser',
    color: 'Navy',
    colorHex: '#1e293b',
    price: 245000,
    folderPath: 'palazo pant/Navy Volume trouser',
    description: 'A relaxed, wide-leg palazzo trouser crafted from breathable Indian linen. The Navy Volume Trouser perfectly balances effortless comfort with structured elegance.'
  },
  {
    name: 'Petrified Oak Volume Trouser',
    color: 'Petrified Oak',
    colorHex: '#5c544d',
    price: 245000,
    folderPath: 'palazo pant/Petrified Oak Volume trouser',
    description: 'A relaxed, wide-leg palazzo trouser crafted from breathable Indian linen. The Petrified Oak Volume Trouser perfectly balances effortless comfort with structured elegance.'
  },
  {
    name: 'Sage Volume Trouser',
    color: 'Sage',
    colorHex: '#8e9e8f',
    price: 245000,
    folderPath: 'palazo pant/Sage Volume trouser',
    description: 'A relaxed, wide-leg palazzo trouser crafted from breathable Indian linen. The Sage Volume Trouser perfectly balances effortless comfort with structured elegance.'
  },
  {
    name: 'Sand Volume Trouser',
    color: 'Sand',
    colorHex: '#d8cca5',
    price: 245000,
    folderPath: 'palazo pant/Sand Volume Trouser',
    description: 'A relaxed, wide-leg palazzo trouser crafted from breathable Indian linen. The Sand Volume Trouser perfectly balances effortless comfort with structured elegance.'
  },

  // STRAIGHT PANTS
  {
    name: 'Grape Shake Linen Column Trouser',
    color: 'Grape Shake',
    colorHex: '#87677B',
    price: 225000,
    folderPath: 'staright pant/Grape shake linen Column Trouser',
    description: 'A tailored, straight-leg column trouser crafted from premium linen. Features clean architectural lines for a sophisticated and versatile everyday look.'
  },
  {
    name: 'Navy Linen Column Trouser',
    color: 'Navy',
    colorHex: '#1e293b',
    price: 225000,
    folderPath: 'staright pant/Navy linen Column Trouser',
    description: 'A tailored, straight-leg column trouser crafted from premium linen. Features clean architectural lines for a sophisticated and versatile everyday look.'
  },
  {
    name: 'Oak Linen Column Trouser',
    color: 'Oak',
    colorHex: '#5c544d',
    price: 225000,
    folderPath: 'staright pant/Oak Linen Column Trouser',
    description: 'A tailored, straight-leg column trouser crafted from premium linen. Features clean architectural lines for a sophisticated and versatile everyday look.'
  },
  {
    name: 'Sand Linen Column Trouser',
    color: 'Sand',
    colorHex: '#d8cca5',
    price: 225000,
    folderPath: 'staright pant/Sand Linen Column Trouser',
    description: 'A tailored, straight-leg column trouser crafted from premium linen. Features clean architectural lines for a sophisticated and versatile everyday look.'
  },
  {
    name: 'Sage Linen Column Trouser',
    color: 'Sage',
    colorHex: '#8e9e8f',
    price: 225000,
    folderPath: 'staright pant/sage linen Column trouser',
    description: 'A tailored, straight-leg column trouser crafted from premium linen. Features clean architectural lines for a sophisticated and versatile everyday look.'
  }
]

const SIZES = ['S', 'M', 'L', 'XL', '2XL', '3XL']
const BASE_IMG_DIR = '/Users/soundariyanvenkatachalam/Desktop/Biahama/images and pdf/pant/'

async function uploadImage(filePath, publicId) {
  try {
    const res = await cloudinary.v2.uploader.upload(filePath, {
      public_id: publicId,
      folder: 'biahama/pants',
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
  for (const pant of PANTS) {
    console.log(`Processing: ${pant.name}...`)
    const slug = await slugify(pant.name)

    // 1. Upload Images
    const imageUrls = []
    for (let i = 1; i <= 5; i++) {
      const imgPath = path.join(BASE_IMG_DIR, pant.folderPath, `${i}.png`)
      if (fs.existsSync(imgPath)) {
        console.log(`Uploading ${i}.png...`)
        const url = await uploadImage(imgPath, `${slug}-${i}`)
        if (url) {
          imageUrls.push({
            url: url,
            altText: `${pant.name} - View ${i}`,
            isPrimary: i === 1,
            sortOrder: i
          })
        }
      } else {
        console.warn(`File not found: ${imgPath}`)
      }
    }

    console.log(`Saving ${pant.name} to database using Prisma...`)
    
    const existing = await prisma.product.findUnique({ where: { slug } })
    if (existing) {
      console.log(`Deleting existing product...`)
      await prisma.productVariant.deleteMany({ where: { productId: existing.id } })
      await prisma.productImage.deleteMany({ where: { productId: existing.id } })
      await prisma.product.delete({ where: { id: existing.id } })
    }

    const product = await prisma.product.create({
      data: {
        name: pant.name,
        slug: slug,
        description: pant.description,
        category: 'trousers',
        fabric: '100% Premium Organic Indian Linen',
        care: 'Hand wash cold or dry clean. Do not bleach. Dry flat in shade. Iron medium heat.',
        isActive: true,
        images: {
          create: imageUrls
        },
        variants: {
          create: SIZES.map(size => ({
            sku: `BIA-PANT-${slug.toUpperCase()}-${size}`,
            size: size,
            color: pant.color,
            colorHex: pant.colorHex,
            stockQty: 10,
            price: pant.price,
            comparePrice: pant.price + 50000
          }))
        }
      }
    })

    console.log(`Successfully created ${pant.name} (ID: ${product.id}) with ${imageUrls.length} images and ${SIZES.length} variants!`)
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
