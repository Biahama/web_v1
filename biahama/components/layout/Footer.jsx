import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = {
  Company: [
    { label: 'Our Story',      href: '/about' },
    { label: 'Sustainability', href: '/sustainability' },
    { label: 'Careers',        href: '/careers' },
    { label: 'Press',          href: '/press' },
  ],
  Help: [
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
        style={{ borderTop: '1px solid var(--border)', background: 'var(--bg)', padding: 'var(--space-3) var(--space-5)' }}
      >
        <div
          className="flex flex-col md:flex-row items-center justify-between gap-4"
          style={{ color: 'var(--gray)', fontFamily: 'var(--font-ui)', fontWeight: 'var(--text-tag-weight)', fontSize: 'var(--text-tag-size)', letterSpacing: 'var(--text-tag-tracking)' }}
        >
          <span>2026 © Biahama SpA Vat 01886120540</span>
          <span>Made with intention · India</span>
        </div>
      </footer>
    )
  }

  return (
    <footer
      style={{ borderTop: '1px solid var(--border)', background: 'var(--bg)', paddingBottom: 'var(--space-5)' }}
    >
      <div style={{ paddingTop: 'var(--space-6)', paddingLeft: 'var(--space-5)', paddingRight: 'var(--space-5)' }}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Brand column */}
          <div>
            <p
              className="mb-4"
              style={{ fontFamily: 'var(--font-display)', fontWeight: 'var(--text-heading-weight)', fontStyle: 'italic', fontSize: 22, letterSpacing: '0.2em', color: 'var(--black)' }}
            >
              Biahama
            </p>
            <p style={{ color: 'var(--gray)', fontFamily: 'var(--font-ui)', fontWeight: 'var(--text-nav-weight)', fontSize: 'var(--text-nav-size)', lineHeight: 1.7 }}>
              Luxury linen, handcrafted<br />in India. Wear slowly.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(links).map(([heading, items]) => (
            <div key={heading}>
              <h4
                className="uppercase mb-5"
                style={{ color: 'var(--black)', fontFamily: 'var(--font-ui)', fontWeight: 'var(--text-tag-weight)', fontSize: 'var(--text-tag-size)', letterSpacing: 'var(--text-tag-tracking)' }}
              >
                {heading}
              </h4>
              <ul className="space-y-3">
                {items.map(({ label, href }) => (
                  <li key={label}>
                    <Link
                      href={href}
                      className="transition-opacity hover:opacity-60"
                      style={{ color: 'var(--gray)', fontFamily: 'var(--font-ui)', fontWeight: 'var(--text-nav-weight)', fontSize: 'var(--text-nav-size)' }}
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
          style={{ borderTop: '1px solid var(--border)', color: 'var(--gray)', fontFamily: 'var(--font-ui)', fontWeight: 'var(--text-tag-weight)', fontSize: 'var(--text-tag-size)', letterSpacing: 'var(--text-tag-tracking)' }}
        >
          <span>© {new Date().getFullYear()} Biahama. All rights reserved.</span>
          <span>Made with intention · India</span>
        </div>
      </div>
    </footer>
  )
}
