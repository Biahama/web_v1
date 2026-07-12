// ============================================================
// AUTH CALLBACK — where people land after clicking the
// confirmation link in their email, or after logging in
// with Google. It turns the one-time code in the URL into a
// real logged-in session, then sends them to the homepage.
// ============================================================

import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { logError } from '@/lib/logger'

export async function GET(req) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')

  if (code) {
    try {
      const supabase = await createClient()
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (error) throw error
      // Success — logged in. Go home.
      return NextResponse.redirect(new URL('/', url.origin))
    } catch (error) {
      await logError('auth/callback', error, { hadCode: true })
      // The code was invalid or expired — open the login drawer
      // so they can simply log in with their password instead.
      return NextResponse.redirect(new URL('/?login=true', url.origin))
    }
  }

  // No code in the URL — just go home.
  return NextResponse.redirect(new URL('/', url.origin))
}
