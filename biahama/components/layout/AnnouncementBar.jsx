'use client'

import { usePathname } from 'next/navigation'

// The default message, used when the admin hasn't set their own.
const DEFAULT_TEXT =
  'Free shipping on orders above ₹3,000  ·  New collection arriving this season'

export default function AnnouncementBar({ text = DEFAULT_TEXT }) {
  const pathname = usePathname()

  // The homepage hero starts at the very top, so no bar there.
  if (pathname === '/') return null

  return (
    <div
      className="w-full text-center"
      style={{
        background: 'var(--black)',
        color: '#ffffff',
        fontFamily: 'Jost, sans-serif',
        fontWeight: 300,
        fontSize: 10,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        padding: '8px 48px',
      }}
    >
      {text}
    </div>
  )
}
