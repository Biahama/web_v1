 'use client'
import Link from 'next/link'
import { STOREFRONT_COLLECTIONS } from '@/lib/collections'
import Image from 'next/image'
import { useAuth } from '@/components/providers/AuthProvider'
import { Suspense, useState, useEffect, useCallback } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import CartDrawer from '@/components/ui/CartDrawer'
import LoginDrawer from '@/components/auth/LoginDrawer'
import SearchOverlay from '@/components/ui/SearchOverlay'
import { useDialog } from '@/components/ui/useDialog'
import { safeReturnPath } from '@/lib/auth-redirect'
import { useCart } from '@/lib/cart'

const CATEGORIES = STOREFRONT_COLLECTIONS.map(c => ({ ...c, img: c.image }))
export default function Navbar() {
  const { session } = useAuth()
  const { count } = useCart()
  const pathname = usePathname()
  const router = useRouter()
  const [panel, setPanel] = useState(null)
  const [returnTo, setReturnTo] = useState('/')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const menuRef = useDialog(panel === 'menu', () => setPanel(null))
  const openLogin = useCallback(path => { setReturnTo(path); setPanel('login') }, [])
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > window.innerHeight * .9)
    queueMicrotask(handleScroll)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [pathname])
  const solid = pathname !== '/' || scrolled || dropdownOpen || panel === 'menu'
  const color = solid ? 'var(--black)' : '#ffffff'
  const login = () => { setReturnTo(pathname); setPanel('login') }
  if (pathname === '/checkout') return <nav className="site-nav checkout-nav"><Link className="brand" href="/">BIAHAMA</Link><Link className="checkout-bag" href="/cart">Back to bag</Link></nav>
  return <>
    <Suspense fallback={null}><LoginFromQuery onLogin={openLogin} /></Suspense>
    <nav className={`site-nav ${solid ? 'solid' : 'over-hero'}`} style={{ color }} aria-label="Main navigation">
      <button className="mobile-menu nav-icon" aria-label="Open menu" aria-expanded={panel === 'menu'} onClick={() => setPanel('menu')}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 6h18M3 12h18M3 18h18" /></svg></button>
      <div className="desktop-links">
        <Link href="/">Home</Link>
        <div className="collection-menu" onMouseEnter={() => setDropdownOpen(true)} onMouseLeave={() => setDropdownOpen(false)} onKeyDown={e => { if (e.key === 'Escape') setDropdownOpen(false) }}>
          <Link href="/shop" onFocus={() => setDropdownOpen(true)} onClick={() => setDropdownOpen(false)}>Collection</Link>
          {dropdownOpen && <div className="collection-dropdown" onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setDropdownOpen(false) }}>
            {CATEGORIES.map(cat => <Link key={cat.slug} href={`/shop?cat=${cat.slug}`} onClick={() => setDropdownOpen(false)}><Image width={400} height={600} sizes="25vw" src={cat.img} alt="" /><span>{cat.name}</span></Link>)}
          </div>}
        </div>
        <Link href="/contact">Contact us</Link>
      </div>
      <Link className="brand" href="/">BIAHAMA</Link>
      <div className="nav-actions">
        <button className="nav-icon" aria-label="Search" onClick={() => setPanel('search')}><SearchIcon /><span className="nav-label">Search</span></button>
        <button className="nav-icon wardrobe-nav" aria-label="My wardrobe" onClick={() => session ? router.push('/account/wardrobe') : login()}><WardrobeIcon themeColor={color} /><span className="nav-label">My wardrobe</span></button>
        <button className="nav-icon" aria-label={`Cart, ${count} items`} onClick={() => setPanel('cart')}><CartIcon /><span className="cart-count">{count}</span></button>
        <button className="nav-icon profile-nav" aria-label={session ? 'Account' : 'Log in'} onClick={() => session ? router.push('/account') : login()}><ProfileIcon /></button>
      </div>
    </nav>
    {panel === 'menu' && <div className="mobile-menu-overlay" ref={menuRef} role="dialog" aria-modal="true" aria-label="Navigation menu">
      <button className="nav-icon menu-close" onClick={() => setPanel(null)} aria-label="Close menu">×</button>
      <Link href="/" onClick={() => setPanel(null)}>Home</Link>
      {CATEGORIES.map(cat => <Link key={cat.slug} href={`/shop?cat=${cat.slug}`} onClick={() => setPanel(null)}>{cat.name}</Link>)}
      <Link href="/contact" onClick={() => setPanel(null)}>Contact us</Link>
      <button onClick={() => { if (session) { setPanel(null); router.push('/account') } else login() }}>{session ? 'My account' : 'Log in / Register'}</button>
      <button onClick={() => { if (session) { setPanel(null); router.push('/account/wardrobe') } else login() }}>My wardrobe</button>
    </div>}
    {panel === 'search' && <SearchOverlay open onClose={() => setPanel(null)} />}
    <CartDrawer open={panel === 'cart'} onClose={() => setPanel(null)} />
    <LoginDrawer open={panel === 'login'} returnTo={returnTo} onClose={() => setPanel(null)} />
  </>
}

function LoginFromQuery({ onLogin }) {
  const search = useSearchParams().toString()
  const pathname = usePathname()
  const router = useRouter()
  useEffect(() => {
    const params = new URLSearchParams(search)
    if (params.get('login') !== 'true') return
    onLogin(safeReturnPath(params.get('next')))
    params.delete('login')
    params.delete('next')
    router.replace(pathname + (params.size ? '?' + params.toString() : ''), { scroll: false })
  }, [search, pathname, router, onLogin])
  return null
}

function SearchIcon() {
  return (
    <svg width="var(--icon-search)" height="var(--icon-search)" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

function WardrobeIcon({ themeColor }) {
  const isInverted = themeColor === '#ffffff'
  return (
    <Image
      width={22} height={22} src="/cloth-hanger.png"
      alt="Wardrobe"
      style={{
        width: 'var(--icon-wardrobe)',
        height: 'var(--icon-wardrobe)',
        objectFit: 'contain',
        filter: isInverted ? 'invert(1)' : 'none',
      }}
    />
  )
}

function CartIcon() {
  return (
    <svg width="var(--icon-cart)" height="var(--icon-cart)" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  )
}

function ProfileIcon() {
  return (
    <svg width="var(--icon-cart)" height="var(--icon-cart)" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}
