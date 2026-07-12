// ============================================================
// WHO IS ALLOWED INTO /admin
// ============================================================
// Admins are listed in the ADMIN_EMAILS environment variable,
// comma-separated, e.g.:
//   ADMIN_EMAILS=you@gmail.com,brother@gmail.com
// They log in with their normal site account — no separate
// password. Anyone NOT on the list gets sent to the homepage
// and admin APIs refuse to act.
//
// SECURITY RULE: every /api/admin/* route MUST call
// requireAdmin() as its first step.
// ============================================================

import { createClient } from '@/utils/supabase/server'

/** Returns the logged-in admin user, or null if not an admin. */
export async function getAdminUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return null

  const allowed = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)

  return allowed.includes(user.email.toLowerCase()) ? user : null
}

/**
 * For API routes: returns the admin user, or throws an error that
 * withErrorLogging turns into a clear response. Usage:
 *   const admin = await requireAdmin()
 */
export async function requireAdmin() {
  const admin = await getAdminUser()
  if (!admin) {
    const err = new Error('Not authorized — admin access only')
    err.statusCode = 403
    throw err
  }
  return admin
}
