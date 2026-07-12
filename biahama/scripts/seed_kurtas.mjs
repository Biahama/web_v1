// ============================================================
// SEED SCRIPT: KURTAS
// ============================================================
// Adds all kurta products to the real database, the same way
// pants/shirts/tunics were added (see scripts/seed_pants.mjs).
//
// For every kurta it will:
//   1. Upload the 5 photos from public/images/KURTA/<folder>/
//      to Cloudinary (our image hosting service)
//   2. Create the product, its images, and its size variants
//      (S to 3XL) in the database
//
// HOW TO RUN (from the project folder, with internet access):
//   node scripts/seed_kurtas.mjs
//
// SAFE TO RUN TWICE: if a kurta is already in the database it
// is skipped, not duplicated.
// ============================================================

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

// The official colour swatches for kurtas
const COLOR_HEXES = {
  'Grape Shake': '#5b4a58',
  'Navy': '#1e2d42',
  'Oak': '#9e7e5d',
  'Purple': '#4b2c5c',
  'Sage': '#828e84',
  'Sand': '#d5cbb8'
}

// One entry per folder inside public/images/KURTA/
// NOTE: some folder names contain typos ("Kutra" instead of "Kurta").
// The folderPath must match the folder on disk EXACTLY, but the
// "name" is the corrected version shown to customers.
const KURTAS = [
  {
    name: 'Grape Shake Pin Tuck Linen Kurta',
    color: 'Grape Shake',
    folderPath: 'Grape shake Pin Tuck Linen Kutra',
    description: 'A relaxed, straight-cut kurta crafted from breathable Indian linen. Delicate pin tuck detailing gives the Grape Shake Pin Tuck Linen Kurta quiet structure and understated elegance.'
  },
  {
    name: 'Navy A-line Linen Kurti',
    color: 'Navy',
    folderPath: 'Navy A-line Linen Kurti',
    description: 'A graceful A-line kurti crafted from breathable Indian linen. The Navy A-line Linen Kurti drapes softly for effortless comfort and understated elegance.'
  },
  {
    name: 'Navy Pin Tuck Linen Kurta',
    color: 'Navy',
    folderPath: 'Navy Pin Tuck Linen Kutra',
    description: 'A relaxed, straight-cut kurta crafted from breathable Indian linen. Delicate pin tuck detailing gives the Navy Pin Tuck Linen Kurta quiet structure and understated elegance.'
  },
  {
    name: 'Oak A-line Linen Kurti',
    color: 'Oak',
    folderPath: 'Oak A-line Linen Kurti',
    description: 'A graceful A-line kurti crafted from breathable Indian linen. The Oak A-line Linen Kurti drapes softly for effortless comfort and understated elegance.'
  },
  {
    name: 'Oak Pin Tuck Linen Kurta',
    color: 'Oak',
    folderPath: 'Oak Pin Tuck Linen Kutra',
    description: 'A relaxed, straight-cut kurta crafted from breathable Indian linen. Delicate pin tuck detailing gives the Oak Pin Tuck Linen Kurta quiet structure and understated elegance.'
  },
  {
    name: 'Purple A-line Linen Kurti',
    color: 'Purple',
    folderPath: 'Purple A-line Linen Kurti',
    description: 'A graceful A-line kurti crafted from breathable Indian linen. The Purple A-line Linen Kurti drapes softly for effortless comfort and understated elegance.'
  },
  {
    name: 'Sage Pin Tuck Linen Kurta',
    color: 'Sage',
    folderPath: 'Sage Pin Tuck Linen Kutra',
    description: 'A relaxed, straight-cut kurta crafted from breathable Indian linen. Delicate pin tuck detailing gives the Sage Pin Tuck Linen Kurta quiet structure and understated elegance.'
  },
  {
    name: 'Sage Solid Long Linen Kurti',
    color: 'Sage',
    folderPath: 'Sage Solid long linen kurti',
    description: 'A clean, solid-tone long kurti crafted from breathable Indian linen. The Sage Solid Long Linen Kurti pairs a flattering length with year-round comfort and understated elegance.'
  },
  {
    name: 'Sand A-line Linen Kurti',
    color: 'Sand',
    folderPath: 'Sand A-line Linen Kurti',
    description: 'A graceful A-line kurti crafted from breathable Indian linen. The Sand A-line Linen Kurti drapes softly for effortless comfort and understated elegance.'
  },
  {
    name: 'Sand Solid Long Linen Kurti',
    color: 'Sand',
    folderPath: 'Sand Solid long linen kurti',
    description: 'A clean, solid-tone long kurti crafted from breathable Indian linen. The Sand Solid Long Linen Kurti pairs a flattering length with year-round comfort and understated elegance.'
  }
]

const PRICE = 245000 // Rs 2,450 stored in paise, matching pants
const SIZES = ['S', 'M', 'L', 'XL', '2XL', '3XL']
const STOCK_PER_SIZE = 5

// The kurta photos live inside the project itself
const BASE_IMG_DIR = path.join(__dirname, '../public/images/KURTA')

async function uploadImage(filePath, publicId) {
  try {
    const res = await cloudinary.v2.uploader.upload(filePath, {
      public_id: publicId,
      folder: 'biahama/kurtas',
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

// Turn a product name into a web address slug,
// e.g. "Navy Pin Tuck Linen Kurta" -> "navy-pin-tuck-linen-kurta"
function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
}

async function main() {
  let created = 0
  let skipped = 0

  for (const kurta of KURTAS) {
    console.log(`\nProcessing: ${kurta.name}...`)
    const slug = slugify(kurta.name)

    // Skip if this kurta is already in the database (safe to re-run)
    const existing = await prisma.product.findUnique({ where: { slug } })
    if (existing) {
      console.log(`Already in database (slug: ${slug}) - skipping.`)
      skipped++
      continue
    }

    // 1. Upload the 5 photos (1.png to 5.png) to Cloudinary
    const imageUrls = []
    for (let i = 1; i <= 5; i++) {
      const imgPath = path.join(BASE_IMG_DIR, kurta.folderPath, `${i}.png`)
      if (fs.existsSync(imgPath)) {
        console.log(`Uploading ${i}.png...`)
        const url = await uploadImage(imgPath, `${slug}-${i}`)
        if (url) {
          imageUrls.push({
            url: url,
            altText: `${kurta.name} - View ${i}`,
            isPrimary: i === 1,
            sortOrder: i
          })
        }
      } else {
        console.warn(`File not found: ${imgPath}`)
      }
    }

    if (imageUrls.length === 0) {
      // Stop rather than create a product with no photos.
      throw new Error(
        `No images could be uploaded for "${kurta.name}". ` +
        `Check that the folder exists: public/images/KURTA/${kurta.folderPath}`
      )
    }

    // 2. Save the product, its images and its size variants
    console.log(`Saving ${kurta.name} to the database...`)

    const product = await prisma.product.create({
      data: {
        name: kurta.name,
        slug: slug,
        description: kurta.description,
        category: 'Kurta',
        fabric: '100% Premium Organic Indian Linen',
        care: 'Hand wash cold or dry clean. Do not bleach. Dry flat in shade. Iron medium heat.',
        isActive: true,
        images: {
          create: imageUrls
        },
        variants: {
          create: SIZES.map(size => ({
            sku: `BIA-KURTA-${slug.toUpperCase()}-${size}`,
            size: size,
            color: kurta.color,
            colorHex: COLOR_HEXES[kurta.color],
            stockQty: STOCK_PER_SIZE,
            price: PRICE,
            comparePrice: PRICE + 50000
          }))
        }
      }
    })

    console.log(`Successfully created ${kurta.name} (ID: ${product.id}) with ${imageUrls.length} images and ${SIZES.length} variants!`)
    created++
  }

  console.log(`\nDone. Created ${created} kurtas, skipped ${skipped}.`)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    try { await prisma.$disconnect() } catch (e) {}
  })
