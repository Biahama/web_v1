import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '../.env.local') })

const { prisma } = await import('../lib/prisma.js')

async function main() {
  try {
    const categories = ['trousers', 'shirts', 'tunics']
    
    for (const cat of categories) {
      const items = await prisma.product.findMany({
        where: { category: cat },
        select: { name: true, slug: true }
      })
      console.log(`\n=== ${cat.toUpperCase()} (${items.length}) ===`)
      console.log(JSON.stringify(items, null, 2))
    }
  } catch(e) {
    console.error("Error:", e)
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
