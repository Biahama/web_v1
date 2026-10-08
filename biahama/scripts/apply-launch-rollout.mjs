import { readFile } from 'node:fs/promises'
import { config } from 'dotenv'
import pg from 'pg'

const envArg = process.argv.indexOf('--env')
config({ path: envArg >= 0 ? process.argv[envArg + 1] : '.env.local', quiet: true })
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required')
const client = new pg.Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 10000 })
try {
  await client.connect()
  const role = await client.query('SELECT rolbypassrls FROM pg_roles WHERE rolname=current_user')
  if (!role.rows[0]?.rolbypassrls) throw new Error('The storefront database role must bypass row security before this rollout can run')
  const customerService = process.argv.includes('--customer-service')
  const sql = await readFile(new URL(customerService ? '../prisma/rollouts/20261007_customer_service.sql' : '../prisma/rollouts/20261005_checkout.sql', import.meta.url), 'utf8')
  await client.query(sql)
  const tables = await client.query(`SELECT tablename FROM pg_tables WHERE schemaname='public' AND rowsecurity=true ORDER BY tablename`)
  console.log(`${customerService ? 'Customer-service' : 'Launch'} schema applied. Row security is enabled on ${tables.rows.length} public-schema tables. ${customerService ? 'Saved-address default flags were normalized. Delivery dates were not backfilled.' : 'No customer, order, product, or stock records were modified.'}`)
} catch (error) {
  await client.query('ROLLBACK').catch(() => {})
  console.error(error.message)
  process.exitCode = 1
} finally { await client.end() }
