// ============================================================
// KEEPS THE APP'S USER TABLE IN SYNC WITH SUPABASE LOGIN
// ============================================================
// Why this exists:
// Sign-up/login is handled by Supabase Auth, which stores users
// in its own hidden table. But OUR tables (Cart, Address, Order)
// require a matching row in OUR "User" table.
//
// Without this, a new customer's first add-to-cart would fail
// with a confusing database error.
//
// Call ensureUser(user) at the start of any route that writes
// user data. It creates the User row if missing (and is a
// harmless no-op if the row already exists).
// ============================================================

import { prisma } from './prisma'

export async function ensureUser(supabaseUser) {
  const meta = supabaseUser.user_metadata ?? {}
  const name =
    [meta.first_name, meta.last_name].filter(Boolean).join(' ') ||
    meta.full_name ||
    meta.name ||
    null

  await prisma.user.upsert({
    where: { id: supabaseUser.id },
    update: {}, // already exists — nothing to change
    create: {
      id: supabaseUser.id,
      email: supabaseUser.email,
      name,
      provider: supabaseUser.app_metadata?.provider ?? 'email',
    },
  })
}
