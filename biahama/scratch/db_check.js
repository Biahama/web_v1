require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const pg = require('pg');

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const count = await prisma.product.count();
  console.log('Total products in database:', count);
  const products = await prisma.product.findMany({
    include: { images: true }
  });
  console.log('Products:', JSON.stringify(products, null, 2));
  await pool.end();
}

main().catch(console.error);
