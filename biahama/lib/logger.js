// ============================================================
// CENTRAL ERROR LOGGER
// ============================================================
// Every error on the site goes through this file.
// Errors are saved to the database (ErrorLog table) with a
// timestamp, so you can always see what broke and when:
//   Supabase -> Table Editor -> ErrorLog (sort by createdAt)
//
// If the database itself is unreachable, the error still prints
// to the server console so it is never lost silently.
// ============================================================

import { NextResponse } from 'next/server'
import { prisma } from './prisma'

/**
 * Save an error to the ErrorLog table.
 *
 * @param {string} source  - where it happened, e.g. "api/cart POST"
 * @param {Error|string} error - the error itself
 * @param {object} context - anything helpful (userId, input, etc.)
 */
export async function logError(source, error, context = {}) {
  const message = error?.message ?? String(error)

  // Always print to the console first (never fails)
  console.error(`[ERROR] [${source}] ${message}`, error?.stack ?? '')

  try {
    await prisma.errorLog.create({
      data: {
        source,
        message,
        stack: error?.stack ?? null,
        context,
      },
    })
  } catch (dbError) {
    // The logger itself must never crash the site.
    console.error(`[ERROR] Could not write to ErrorLog table: ${dbError.message}`)
  }
}

/**
 * Wrap an API route so ANY unexpected crash is:
 *   1. logged to the database with a timestamp
 *   2. returned to the browser as a clear message saying what broke
 *
 * Usage in a route file:
 *   export const POST = withErrorLogging('api/cart POST', async (req) => { ... })
 */
export function withErrorLogging(source, handler) {
  return async (...args) => {
    try {
      return await handler(...args)
    } catch (error) {
      const req = args[0]
      await logError(source, error, { url: req?.url ?? null })
      return NextResponse.json(
        {
          error: `Something went wrong in "${source}". The error has been recorded with a timestamp in the ErrorLog table.`,
          detail: error?.message ?? String(error),
        },
        { status: 500 }
      )
    }
  }
}
