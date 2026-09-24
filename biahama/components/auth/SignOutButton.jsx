'use client'

// Sign-out button — used on the account page.
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

export default function SignOutButton() {
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <button
      onClick={handleSignOut}
      style={{
        background: 'none',
        border: '1px solid #262626',
        color: '#262626',
        padding: '10px 28px',
        fontSize: 12,
        letterSpacing: 2,
        textTransform: 'uppercase',
        cursor: 'pointer',
        fontFamily: 'var(--font-ui)',
      }}
    >
      Sign out
    </button>
  )
}
