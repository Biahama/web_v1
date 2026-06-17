'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useState, useRef, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import CartDrawer from '@/components/ui/CartDrawer'
import { useCart } from '@/lib/cart'

const DROPDOWN_CATEGORIES = [
  { name: 'Kurta', slug: 'kurtas', img: 'https://res.cloudinary.com/dc30t7io2/image/upload/q_auto,f_auto,w_800,h_1200,c_fill/v1781050257/biahama/collection_hover_kurta.png' },
  { name: 'Shirts', slug: 'shirts', img: 'https://res.cloudinary.com/dc30t7io2/image/upload/q_auto,f_auto,w_800,h_1200,c_fill/v1781050258/biahama/collection_hover_shirt.png' },
  { name: 'Tunics', slug: 'tunics', img: 'https://res.cloudinary.com/dc30t7io2/image/upload/q_auto,f_auto,w_800,h_1200,c_fill/v1781050259/biahama/collection_hover_tunic.png' },
  { name: 'Pant', slug: 'trousers', img: 'https://res.cloudinary.com/dc30t7io2/image/upload/q_auto,f_auto,w_800,h_1200,c_fill/v1781050260/biahama/collection_hover_pant.png' },
]

export default function Navbar() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const router = useRouter()
  const searchInputRef = useRef(null)
  const [searchActive, setSearchActive] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [cartOpen, setCartOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const { count } = useCart()

  const collectionRef = useRef(null)
  const [leftOffset, setLeftOffset] = useState(0)

  useEffect(() => {
    function updateOffset() {
      if (collectionRef.current) {
        const rect = collectionRef.current.getBoundingClientRect()
        setLeftOffset(rect.left)
      }
    }
    updateOffset()
    window.addEventListener('resize', updateOffset)
    return () => window.removeEventListener('resize', updateOffset)
  }, [])

  const isHome = pathname === '/'
  const showSolidNavbar = !isHome || dropdownOpen
  const themeColor = showSolidNavbar ? 'var(--black)' : '#ffffff'
  
  const handleSearchSubmit = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/shop?q=${encodeURIComponent(searchQuery.trim())}`)
      setSearchActive(false)
    }
  }

  const isCheckout = pathname === '/checkout'

  if (isCheckout) {
    return (
      <nav
        className="fixed top-0 left-0 right-0 z-40 flex items-center justify-center"
        style={{
          height: 56,
          background: 'var(--bg)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <Link
          href="/"
          className="select-none"
          style={{
            fontFamily: 'Cormorant Garamond, serif',
            fontWeight: 300,
            fontSize: 28,
            color: 'var(--black)',
            letterSpacing: '0.3em',
            marginLeft: '0.3em',
          }}
        >
          BIAHAMA
        </Link>
      </nav>
    )
  }

  return (
    <>
      <nav
        className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between transition-all duration-300"
        style={{
          height: 56,
          paddingLeft: 48,
          paddingRight: 48,
          background: dropdownOpen ? 'var(--border)' : (isHome ? 'transparent' : 'var(--bg)'),
          borderBottom: (dropdownOpen || !isHome) ? '1px solid var(--border)' : 'none',
        }}
      >
        {/* Left Section — Home, Collection, Contact Us */}
        <div className="flex-1 flex items-center gap-6 z-50 h-full">
          <Link
            href="/"
            className="text-xs tracking-widest uppercase hover:opacity-60 transition-opacity flex items-center h-full"
            style={{ fontFamily: 'Jost, sans-serif', fontWeight: 300, color: themeColor }}
          >
            Home
          </Link>
          <div
            ref={collectionRef}
            className="relative flex items-center h-full"
            onMouseEnter={() => setDropdownOpen(true)}
            onMouseLeave={() => setDropdownOpen(false)}
          >
            <Link
              href="/shop"
              className="text-xs tracking-widest uppercase hover:opacity-60 transition-opacity flex items-center h-full"
              style={{ fontFamily: 'Jost, sans-serif', fontWeight: 300, color: themeColor }}
            >
              Collection
            </Link>

            {/* Floating hover dropdown */}
            <AnimatePresence>
              {dropdownOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  className="fixed top-[56px] z-50"
                  style={{
                    left: leftOffset > 0 ? leftOffset - 16 : 0,
                    right: 0,
                    background: 'var(--border)',
                    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.05)',
                    paddingTop: 0,
                    paddingLeft: 0,
                    paddingRight: 0,
                    paddingBottom: '16px',
                    overflow: 'hidden',
                  }}
                  onMouseEnter={() => setDropdownOpen(true)}
                  onMouseLeave={() => setDropdownOpen(false)}
                >
                  {/* Horizontal Line spanning the full screen width */}
                  <div style={{ width: '100%', height: '1px', background: 'var(--black)', opacity: 0.15 }} />

                  {/* Content Container aligned with uniform padding */}
                  <div className="flex gap-4 w-full" style={{ paddingLeft: '16px', paddingRight: '16px', paddingTop: '16px', margin: 0 }}>
                    {DROPDOWN_CATEGORIES.map(cat => (
                      <Link
                        key={cat.slug}
                        href={`/shop?cat=${cat.slug}`}
                        className="group relative block overflow-hidden"
                        style={{ flex: 1, aspectRatio: '2/3', border: 'none' }}
                      >
                        {/* Thumbnail Image */}
                        <div className="w-full h-full relative overflow-hidden bg-zinc-100">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={cat.img}
                            alt={cat.name}
                            className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-103"
                          />
                          {/* Subtle dark overlay for text legibility */}
                          <div className="absolute inset-0 bg-black/5 group-hover:bg-black/15 transition-colors duration-500" />
                        </div>
                        {/* Caption Overlay */}
                        <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center z-10">
                          <span
                            className="text-lg tracking-wide"
                            style={{
                              fontFamily: 'Cormorant Garamond, serif',
                              fontStyle: 'italic',
                              color: '#ffffff',
                              fontWeight: 300,
                            }}
                          >
                            {cat.name}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <Link
            href="/#footer"
            className="text-xs tracking-widest uppercase hover:opacity-60 transition-opacity flex items-center h-full"
            style={{ fontFamily: 'Jost, sans-serif', fontWeight: 300, color: themeColor }}
          >
            Contact Us
          </Link>
        </div>

        {/* Center Section — Brand Name */}
        <Link
          href="/"
          className="absolute left-1/2 -translate-x-1/2 select-none z-50 h-full flex items-center"
          style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 300, fontSize: 28, color: themeColor, letterSpacing: '0.3em' }}
        >
          BIAHAMA
        </Link>

        {/* Right Section — Icons */}
        <div className="flex-1 flex items-center justify-end gap-6 z-50 h-full">
          {/* Search */}
          <form
            onSubmit={handleSearchSubmit}
            className="flex items-center h-full"
          >
            <AnimatePresence>
              {searchActive && (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 140, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  style={{ overflow: 'hidden', marginRight: '8px' }}
                >
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Escape') {
                        setSearchActive(false)
                      }
                    }}
                    onBlur={() => {
                      setTimeout(() => {
                        if (searchQuery.trim() === '') setSearchActive(false)
                      }, 200)
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      borderBottom: `1px solid ${themeColor}`,
                      outline: 'none',
                      fontSize: '11px',
                      fontFamily: 'Jost, sans-serif',
                      color: themeColor,
                      width: '100%',
                      paddingBottom: '2px',
                      letterSpacing: '0.05em',
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="button"
              onClick={() => {
                if (searchActive) {
                  if (searchQuery.trim()) {
                    router.push(`/shop?q=${encodeURIComponent(searchQuery.trim())}`)
                    setSearchActive(false)
                  } else {
                    setSearchActive(false)
                  }
                } else {
                  setSearchActive(true)
                  setTimeout(() => searchInputRef.current?.focus(), 50)
                }
              }}
              className="flex items-center gap-2 hover:opacity-60 transition-opacity h-full"
              style={{ color: themeColor, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              <SearchIcon />
              {!searchActive && (
                <span className="text-xs tracking-widest uppercase hidden lg:block" style={{ fontFamily: 'Jost, sans-serif', fontWeight: 300 }}>
                  Search
                </span>
              )}
            </button>
          </form>

          {/* Wardrobe */}
          <Link
            href={session ? '/account/wardrobe' : '/login'}
            className="flex items-center gap-2 hover:opacity-60 transition-opacity h-full"
            style={{ color: themeColor }}
          >
            <WardrobeIcon themeColor={themeColor} />
            <span className="text-xs tracking-widest uppercase hidden lg:block" style={{ fontFamily: 'Jost, sans-serif', fontWeight: 300 }}>
              Wardrobe
            </span>
          </Link>

          {/* Cart */}
          <button
            onClick={() => setCartOpen(true)}
            aria-label="Cart"
            className="hover:opacity-60 transition-opacity flex items-center h-full"
            style={{ color: themeColor }}
          >
            <div className="relative flex items-center">
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
            </div>
          </button>

          {/* Profile */}
          <Link
            href={session ? '/account' : '/login'}
            className="hover:opacity-60 transition-opacity flex items-center h-full"
            style={{ color: themeColor }}
            aria-label="Account"
          >
            <ProfileIcon />
          </Link>
        </div>
      </nav>

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

function WardrobeIcon({ themeColor }) {
  const isInverted = themeColor === '#ffffff'
  return (
    <img
      src="/cloth-hanger.png"
      alt="Wardrobe"
      style={{
        width: '20px',
        height: '20px',
        objectFit: 'contain',
        filter: isInverted ? 'invert(1)' : 'none',
      }}
    />
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
