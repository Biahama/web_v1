'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'

const CATEGORIES = [
  { name: 'KURTA', slug: 'kurtas' },
  { name: 'SHIRTS', slug: 'shirts' },
  { name: 'TUNICS', slug: 'tunics' },
  { name: 'PANT', slug: 'trousers' },
]

export default function FilterTabBar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const activeCategory = searchParams.get('cat') || 'kurtas'

  const showFilterBar = pathname.startsWith('/shop') || pathname.startsWith('/collection');
  if (!showFilterBar) return null;

  return (
    <div 
      style={{ 
        position: 'sticky',
        top: '56px',
        zIndex: 30,
        width: '100%', 
        height: '47px',
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        background: '#f2f2f2',
        borderBottom: '1px solid #e5e5e5'
      }}
    >
      <div style={{ display: 'flex', gap: '48px' }}>
        {CATEGORIES.map(cat => {
          const isActive = activeCategory === cat.slug
          return (
            <Link
              key={cat.slug}
              href={`/shop?cat=${cat.slug}`}
              className={isActive ? 'biahama-tab active' : 'biahama-tab'}
              style={{
                textDecoration: 'none',
                transition: 'color 0.2s, border-color 0.2s',
                fontFamily: 'var(--font-ui)',
                fontSize: '12px',
                fontWeight: '500',
                letterSpacing: '1.5px',
                textTransform: 'uppercase',
                color: isActive ? '#262626' : '#6f6f6f',
                borderBottom: isActive ? '1px solid #262626' : '1px solid transparent',
                paddingBottom: '2px',
                cursor: 'pointer'
              }}
            >
              {cat.name}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
