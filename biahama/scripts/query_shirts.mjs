import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '../.env.local') })

const { prisma } = await import('../lib/prisma.js')

async function main() {
  const shirts = await prisma.product.findMany({
    where: { category: 'shirts' },
    select: {
      name: true,
      slug: true,
      images: {
        select: { url: true }
      }
    }
  })
  
  console.log(JSON.stringify(shirts, null, 2))
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
