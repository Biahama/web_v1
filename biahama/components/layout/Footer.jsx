import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = {
  Philosophy: [
    { label: 'Our Story',      href: '/about' },
    { label: 'Sustainability', href: '/sustainability' },
    { label: 'Careers',        href: '/careers' },
    { label: 'Press',          href: '/press' },
  ],
  'Customer Care': [
    { label: 'Sizing Guide', href: '/sizing' },
    { label: 'Shipping',     href: '/shipping' },
    { label: 'Returns',      href: '/returns' },
    { label: 'Contact',      href: '/contact' },
  ],
  Follow: [
    { label: 'Instagram', href: 'https://instagram.com/biahama' },
    { label: 'Pinterest',  href: 'https://pinterest.com/biahama' },
    { label: 'WhatsApp',   href: 'https://wa.me/919999999999' },
  ],
}

export default function Footer() {
  const pathname = usePathname()
  const isCheckout = pathname === '/checkout'

  if (isCheckout) {
    return (
      <footer
        style={{ borderTop: '1px solid #e5e5e5', background: 'var(--bg)', padding: 'var(--space-3) var(--space-5)' }}
      >
        <div
          className="flex flex-col md:flex-row items-center justify-between gap-4"
          style={{ fontFamily: 'var(--font-ui)', fontSize: '16px', fontWeight: '400', letterSpacing: '0.5px', color: '#6f6f6f' }}
        >
          <span>2026 © Biahama SpA Vat 01886120540</span>
          <span>Made with intention · India</span>
        </div>
      </footer>
    )
  }

  return (
    <footer
      style={{ borderTop: '1px solid #e5e5e5', background: 'var(--bg)', paddingTop: '40px', paddingBottom: '40px' }}
    >
      <div style={{ paddingLeft: 'var(--space-5)', paddingRight: 'var(--space-5)' }}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Newsletter / Brand column */}
          <div>
            <h4
              style={{ fontFamily: 'var(--font-ui)', fontSize: '20px', fontWeight: '400', letterSpacing: '0.8px', color: '#262626', marginBottom: '16px' }}
            >
              Newsletter
            </h4>
            <div className="flex gap-4 mt-8">
              {/* Dummy Social Icons */}
              <div style={{ width: '32px', height: '34px', background: '#f2f2f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                IN
              </div>
              <div style={{ width: '32px', height: '34px', background: '#f2f2f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                PI
              </div>
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(links).map(([heading, items]) => (
            <div key={heading}>
              <h4
                style={{ fontFamily: 'var(--font-ui)', fontSize: '16px', fontWeight: '500', letterSpacing: '0.6px', color: '#262626', marginBottom: '24px' }}
              >
                {heading}
              </h4>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {items.map(({ label, href }) => (
                  <li key={label}>
                    <Link
                      href={href}
                      className="hover:underline transition-all"
                      style={{ fontFamily: 'var(--font-ui)', fontSize: '14px', fontWeight: '300', lineHeight: '17px', letterSpacing: '0.6px', color: '#262626', textDecorationColor: '#262626' }}
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div
          className="mt-16 pt-6 flex flex-col md:flex-row items-center justify-between gap-4"
          style={{ fontFamily: 'var(--font-ui)', fontSize: '16px', fontWeight: '400', letterSpacing: '0.5px', color: '#6f6f6f' }}
        >
          <span>© {new Date().getFullYear()} Biahama. All rights reserved.</span>
          <span>Made with intention · India</span>
        </div>
      </div>
    </footer>
  )
}
