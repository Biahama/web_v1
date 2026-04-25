import Link from 'next/link'

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
  return (
    <footer
      style={{ borderTop: '1px solid var(--border)', background: 'var(--bg)', paddingBottom: 48 }}
    >
      <div style={{ paddingTop: 64, paddingLeft: 48, paddingRight: 48 }}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Brand column */}
          <div>
            <p
              className="mb-4"
              style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 300, fontStyle: 'italic', fontSize: 22, letterSpacing: '0.2em', color: 'var(--black)' }}
            >
              Biahama
            </p>
            <p style={{ color: 'var(--gray)', fontFamily: 'Jost, sans-serif', fontWeight: 300, fontSize: 12, lineHeight: 1.7 }}>
              Luxury linen, handcrafted<br />in India. Wear slowly.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(links).map(([heading, items]) => (
            <div key={heading}>
              <h4
                className="uppercase mb-5"
                style={{ color: 'var(--black)', fontFamily: 'Jost, sans-serif', fontWeight: 300, fontSize: 10, letterSpacing: '0.15em' }}
              >
                {heading}
              </h4>
              <ul className="space-y-3">
                {items.map(({ label, href }) => (
                  <li key={label}>
                    <Link
                      href={href}
                      className="transition-opacity hover:opacity-60"
                      style={{ color: 'var(--gray)', fontFamily: 'Jost, sans-serif', fontWeight: 300, fontSize: 12 }}
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
          style={{ borderTop: '1px solid var(--border)', color: 'var(--gray)', fontFamily: 'Jost, sans-serif', fontWeight: 300, fontSize: 10, letterSpacing: '0.05em' }}
        >
          <span>© {new Date().getFullYear()} Biahama. All rights reserved.</span>
          <span>Made with intention · India</span>
        </div>
      </div>
    </footer>
  )
}
