// ============================================================
// DATABASE CONNECTION — one shared connection pool.
// ============================================================
// The Supabase free tier allows only 15 simultaneous
// connections, so we must be frugal:
//  - max: 5   -> this app never opens more than 5 at once
//  - globalThis caching -> every part of the site shares the
//    SAME pool instead of opening its own (this previously only
//    happened in development, which made production builds open
//    dozens of connections and crash with "max clients reached")
// ============================================================

import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis

function createClient() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    max: 5, // never hold more than 5 of the 15 available connections
    idleTimeoutMillis: 30_000, // release idle connections after 30s
  })
  return new PrismaClient({ log: ['error'], adapter })
}

export const prisma = globalForPrisma.prisma ?? createClient()

// Always share the one client — in development AND production.
globalForPrisma.prisma = prisma
