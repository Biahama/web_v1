'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'

const CATEGORIES = ['All', 'Tunics', 'Shirts', 'Kurtas', 'Dresses', 'Sets', 'Trousers', 'Jackets', 'Wraps']

export default function CategoryTabs({ activeCategory }) {
  const pathname = usePathname()
  const isShopRoot = pathname === '/shop'

  return (
    <div
      className="flex gap-0 overflow-x-auto"
      style={{ borderBottom: '1px solid var(--border)' }}
    >
      {CATEGORIES.map(cat => {
        const slug = cat.toLowerCase()
        const isActive = activeCategory
          ? activeCategory.toLowerCase() === slug || (slug === 'all' && !activeCategory)
          : slug === 'all'

        const href = slug === 'all' ? '/shop' : `/shop/${slug}`

        return (
          <Link
            key={cat}
            href={href}
            className="relative shrink-0 py-3 text-xs tracking-widest uppercase transition-opacity hover:opacity-100"
            style={{
              fontFamily: 'Jost, sans-serif',
              fontWeight: isActive ? 500 : 300,
              color: isActive ? 'var(--black)' : 'var(--gray)',
              opacity: isActive ? 1 : 0.7,
              borderBottom: isActive ? '1px solid var(--black)' : '1px solid transparent',
              marginBottom: -1,
              paddingLeft: 0,
              paddingRight: 20,
              marginRight: 8,
            }}
          >
            {cat}
          </Link>
        )
      })}
    </div>
  )
}
