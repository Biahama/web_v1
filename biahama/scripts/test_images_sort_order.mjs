import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '../.env.local') })

const { prisma } = await import('../lib/prisma.js')

async function main() {
  try {
    const images = await prisma.productImage.findMany({
      where: { product: { category: 'shirts' } },
      select: { url: true, sortOrder: true, isPrimary: true },
      take: 10
    })
    console.log(JSON.stringify(images, null, 2))
  } catch(e) {
    console.error("Error:", e)
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
