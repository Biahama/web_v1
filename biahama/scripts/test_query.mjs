import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '../.env.local') })

const { prisma } = await import('../lib/prisma.js')

async function main() {
  const where = {
    isActive: true,
    category: { equals: 'trousers', mode: 'insensitive' },
  }
  
  try {
    const products = await prisma.product.findMany({
      where,
      take: 50,
      orderBy: { createdAt: 'desc' },
      include: {
        images:   { where: { isPrimary: true }, take: 1 },
        variants: { select: { id: true, price: true, comparePrice: true, stockQty: true, color: true, colorHex: true, size: true } },
      },
    })
    console.log(`Query returned ${products.length} products`)
  } catch(e) {
    console.error("Error:", e)
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
