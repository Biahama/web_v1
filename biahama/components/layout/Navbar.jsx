'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useState } from 'react'
import SearchOverlay from '@/components/ui/SearchOverlay'
import CartDrawer from '@/components/ui/CartDrawer'
import { useCart } from '@/lib/cart'

export default function Navbar() {
  const { data: session } = useSession()
  const [searchOpen, setSearchOpen] = useState(false)
  const [cartOpen,   setCartOpen]   = useState(false)
  const { count } = useCart()

  return (
    <>
      <nav
        className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between"
        style={{ height: 56, paddingLeft: 48, paddingRight: 48, background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}
      >
        {/* Left — empty per design spec */}
        <div className="flex-1" />

        {/* Center — brand name */}
        <Link
          href="/"
          className="absolute left-1/2 -translate-x-1/2 select-none"
          style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 300, fontSize: 28, color: 'var(--black)', letterSpacing: '0.25em' }}
        >
          BIAHAMA
        </Link>

        {/* Right — icons */}
        <div className="flex-1 flex items-center justify-end gap-6">
          <button onClick={() => setSearchOpen(true)} aria-label="Search" className="hover:opacity-60 transition-opacity">
            <SearchIcon />
          </button>

          <Link
            href="/shop"
            className="text-xs tracking-widest uppercase hover:opacity-60 transition-opacity"
            style={{ fontFamily: 'Jost, sans-serif', fontWeight: 300, color: 'var(--black)' }}
          >
            Shop
          </Link>

          <Link
            href={session ? '/account/wardrobe' : '/login'}
            className="flex items-center gap-2 hover:opacity-60 transition-opacity"
          >
            <WardrobeIcon />
            <span
              className="text-xs tracking-widest uppercase hidden md:block"
              style={{ fontFamily: 'Jost, sans-serif', fontWeight: 300, color: 'var(--black)' }}
            >
              Wardrobe
            </span>
          </Link>

          <button
            onClick={() => setCartOpen(true)}
            aria-label="Cart"
            className="relative hover:opacity-60 transition-opacity"
          >
            <CartIcon />
            <span
              className="absolute flex items-center justify-center rounded-full"
              style={{
                width: 13,
                height: 13,
                top: -5,
                right: -7,
                background: 'var(--black)',
                color: 'var(--white)',
                fontSize: 8,
                fontFamily: 'Jost, sans-serif',
              }}
            >
              {count}
            </span>
          </button>
        </div>
      </nav>

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
      <CartDrawer    open={cartOpen}   onClose={() => setCartOpen(false)} />
    </>
  )
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

function WardrobeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3 a2 2 0 0 1 2 2 a2 2 0 0 1 -2 2" />
      <path d="M12 7 L3 16" />
      <path d="M12 7 L21 16" />
      <line x1="2" y1="16" x2="22" y2="16" />
      <line x1="2" y1="16" x2="2" y2="19" />
      <line x1="22" y1="16" x2="22" y2="19" />
      <line x1="2" y1="19" x2="22" y2="19" />
    </svg>
  )
}

function CartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  )
}
