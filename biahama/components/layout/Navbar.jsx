'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import SearchOverlay from '@/components/ui/SearchOverlay'
import CartDrawer from '@/components/ui/CartDrawer'
import { useCart } from '@/lib/cart'

const DROPDOWN_CATEGORIES = [
  { name: 'Dresses', slug: 'dresses', img: 'https://images.unsplash.com/photo-1609357605129-26f69add5d6e?auto=format&fit=crop&w=300&h=480&q=80' },
  { name: 'Shirts', slug: 'shirts', img: 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=300&h=480&q=80' },
  { name: 'Trousers', slug: 'trousers', img: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&w=300&h=480&q=80' },
  { name: 'Tunics', slug: 'tunics', img: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=300&h=480&q=80' },
  { name: 'Sets', slug: 'sets', img: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=300&h=480&q=80' },
]

export default function Navbar() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [searchOpen, setSearchOpen] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const { count } = useCart()

  const isHome = pathname === '/'
  const themeColor = isHome ? '#ffffff' : 'var(--black)'

  return (
    <>
      <nav
        className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between transition-all duration-300"
        style={{
          height: 56,
          paddingLeft: 48,
          paddingRight: 48,
          background: isHome ? 'transparent' : 'var(--bg)',
          borderBottom: isHome ? 'none' : '1px solid var(--border)',
        }}
      >
        {/* Left Section — Home, Collection, Contact Us */}
        <div className="flex-1 flex items-center gap-6 z-50">
          <Link
            href="/"
            className="text-xs tracking-widest uppercase hover:opacity-60 transition-opacity"
            style={{ fontFamily: 'Jost, sans-serif', fontWeight: 300, color: themeColor }}
          >
            Home
          </Link>
          <div
            className="relative py-4"
            onMouseEnter={() => setDropdownOpen(true)}
            onMouseLeave={() => setDropdownOpen(false)}
          >
            <Link
              href="/shop"
              className="text-xs tracking-widest uppercase hover:opacity-60 transition-opacity"
              style={{ fontFamily: 'Jost, sans-serif', fontWeight: 300, color: themeColor }}
            >
              Collection
            </Link>

            {/* Floating hover dropdown */}
            {dropdownOpen && (
              <div
                className="absolute left-0 mt-3 flex gap-3 p-4 transition-all duration-200"
                style={{
                  background: '#ffffff',
                  border: '1px solid var(--border)',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
                  zIndex: 50,
                }}
              >
                {DROPDOWN_CATEGORIES.map(cat => (
                  <Link
                    key={cat.slug}
                    href={`/shop/${cat.slug}`}
                    className="group relative block overflow-hidden"
                    style={{ width: 100, height: 160 }}
                  >
                    {/* Thumbnail Image */}
                    <div className="w-full h-full relative overflow-hidden bg-zinc-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={cat.img}
                        alt={cat.name}
                        className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
                      />
                      {/* Dark overlay gradient */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                    </div>
                    {/* Caption Overlay */}
                    <span
                      className="absolute bottom-2 left-2 text-xs tracking-wider"
                      style={{
                        fontFamily: 'Cormorant Garamond, serif',
                        fontStyle: 'italic',
                        color: '#ffffff',
                        fontWeight: 300,
                      }}
                    >
                      {cat.name}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
          <Link
            href="/#footer"
            className="text-xs tracking-widest uppercase hover:opacity-60 transition-opacity"
            style={{ fontFamily: 'Jost, sans-serif', fontWeight: 300, color: themeColor }}
          >
            Contact Us
          </Link>
        </div>

        {/* Center Section — Brand Name */}
        <Link
          href="/"
          className="absolute left-1/2 -translate-x-1/2 select-none z-50"
          style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 300, fontSize: 28, color: themeColor, letterSpacing: '0.3em' }}
        >
          BIAHAMA
        </Link>

        {/* Right Section — Icons */}
        <div className="flex-1 flex items-center justify-end gap-6 z-50">
          {/* Search */}
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 hover:opacity-60 transition-opacity"
            style={{ color: themeColor }}
          >
            <SearchIcon />
            <span className="text-xs tracking-widest uppercase hidden lg:block" style={{ fontFamily: 'Jost, sans-serif', fontWeight: 300 }}>
              Search
            </span>
          </button>

          {/* Wardrobe */}
          <Link
            href={session ? '/account/wardrobe' : '/login'}
            className="flex items-center gap-2 hover:opacity-60 transition-opacity"
            style={{ color: themeColor }}
          >
            <WardrobeIcon />
            <span className="text-xs tracking-widest uppercase hidden lg:block" style={{ fontFamily: 'Jost, sans-serif', fontWeight: 300 }}>
              Wardrobe
            </span>
          </Link>

          {/* Cart */}
          <button
            onClick={() => setCartOpen(true)}
            aria-label="Cart"
            className="relative hover:opacity-60 transition-opacity"
            style={{ color: themeColor }}
          >
            <CartIcon />
            <span
              className="absolute flex items-center justify-center rounded-full"
              style={{
                width: 13,
                height: 13,
                top: -5,
                right: -7,
                background: isHome ? '#ffffff' : 'var(--black)',
                color: isHome ? 'var(--black)' : '#ffffff',
                fontSize: 8,
                fontFamily: 'Jost, sans-serif',
              }}
            >
              {count}
            </span>
          </button>

          {/* Profile */}
          <Link
            href={session ? '/account' : '/login'}
            className="hover:opacity-60 transition-opacity"
            style={{ color: themeColor }}
            aria-label="Account"
          >
            <ProfileIcon />
          </Link>
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
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
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
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  )
}

function ProfileIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}
