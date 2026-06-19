import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '../.env.local') })

const { prisma } = await import('../lib/prisma.js')

async function main() {
  const products = await prisma.product.findMany({
    where: { category: 'trousers' },
    select: {
      name: true,
      slug: true,
      images: {
        select: { url: true }
      }
    }
  })
  
  console.log(JSON.stringify(products, null, 2))
  console.log(`\nTotal products found: ${products.length}`)
  console.log(`Total images found: ${products.reduce((acc, p) => acc + p.images.length, 0)}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
