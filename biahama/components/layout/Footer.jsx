'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

// ---- Contact details shown in the "Let's talk" column. ----
const EMAIL = 'hello@biahama.com'
const PHONE = '+91 95853 33004'
const WHATSAPP = 'https://wa.me/919585333004'

const columns = [
  {
    heading: 'About Us',
    items: [
      { label: 'Our Story', href: '/about' },
      { label: 'Contact Us', href: '/contact' },
    ],
  },
  {
    heading: 'Customer Care',
    items: [
      { label: 'Size Guide', href: '/sizing' },
      { label: 'Shipping & Returns', href: '/shipping' },
      { label: 'FAQs', href: '/faq' },
      { label: 'WhatsApp', href: WHATSAPP },
    ],
  },
]

const social = [
  { label: 'Instagram', href: 'https://instagram.com/biahama', icon: 'instagram' },
  { label: 'LinkedIn', href: 'https://linkedin.com/company/biahama', icon: 'linkedin' },
]

const headingStyle = {
  fontFamily: 'var(--font-ui)',
  fontSize: '15px',
  fontWeight: '500',
  letterSpacing: '1.6px',
  textTransform: 'uppercase',
  color: '#262626',
  marginBottom: '32px',
}

const linkStyle = {
  fontFamily: 'var(--font-ui)',
  fontSize: '15px',
  fontWeight: '300',
  letterSpacing: '0.4px',
  color: '#262626',
}

function Icon({ name }) {
  const common = {
    width: 20,
    height: 20,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
  }
  switch (name) {
    case 'mail':
      return (
        <svg {...common}>
          <rect x="2.5" y="5" width="19" height="14" />
          <path d="m2.5 6 9.5 7 9.5-7" />
        </svg>
      )
    case 'phone':
      return (
        <svg {...common}>
          <path d="M7 3.5 9.5 8l-2 2a12 12 0 0 0 6.5 6.5l2-2 4.5 2.5v3a1.5 1.5 0 0 1-1.7 1.5C10.4 20.6 3.4 13.6 2.5 5.2A1.5 1.5 0 0 1 4 3.5Z" />
        </svg>
      )
    case 'chat':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9.5" />
          <path d="M9 8.5 10.5 11l-1 1a7 7 0 0 0 3.5 3.5l1-1 2.5 1.5v1.4a1 1 0 0 1-1.1 1c-4-.5-7.3-3.8-7.8-7.8A1 1 0 0 1 8.6 8.5Z" />
        </svg>
      )
    case 'instagram':
      return (
        <svg {...common}>
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.2" cy="6.8" r="0.9" fill="currentColor" stroke="none" />
        </svg>
      )
    case 'linkedin':
      return (
        <svg {...common}>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M7.5 10.5V17M7.5 7.6v.1M11.5 17v-6.5M11.5 13.2c0-1.5.9-2.7 2.4-2.7s2.6 1 2.6 2.9V17" />
        </svg>
      )
    default:
      return null
  }
}

export default function Footer() {
  const pathname = usePathname()

  if (pathname === '/checkout') {
    return (
      <footer
        style={{ borderTop: '1px solid #e5e5e5', background: 'var(--bg)', padding: 'var(--space-3) var(--space-5)' }}
      >
        <div
          className="flex flex-col md:flex-row items-center justify-between gap-4"
          style={{ fontFamily: 'var(--font-ui)', fontSize: '16px', fontWeight: '400', letterSpacing: '0.5px', color: '#6f6f6f' }}
        >
          <span>© {new Date().getFullYear()} Biahama. All rights reserved.</span>
          <span>Made with intention · India</span>
        </div>
      </footer>
    )
  }

  return (
    <footer style={{ borderTop: '1px solid #e5e5e5', background: 'var(--bg)', paddingTop: '72px', paddingBottom: '32px' }}>
      <div style={{ paddingLeft: 'var(--space-5)', paddingRight: 'var(--space-5)' }}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Let's talk */}
          <div>
            <h4 style={headingStyle}>Let&rsquo;s Talk</h4>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <li className="flex items-center gap-4">
                <Icon name="mail" />
                <a href={`mailto:${EMAIL}`} style={linkStyle} className="hover:underline">{EMAIL}</a>
              </li>
              <li className="flex items-center gap-4">
                <Icon name="phone" />
                <a href={`tel:${PHONE.replace(/\s/g, '')}`} style={linkStyle} className="hover:underline">{PHONE}</a>
              </li>
              <li className="flex items-center gap-4">
                <Icon name="chat" />
                <a href={WHATSAPP} target="_blank" rel="noreferrer" style={{ ...linkStyle, textDecoration: 'underline' }}>
                  Chat with us
                </a>
              </li>
            </ul>
            <div style={{ width: '186px', maxWidth: '100%', borderTop: '1px solid #d8d5cf', margin: '32px 0 24px' }} />
            <p style={{ ...linkStyle, color: '#262626' }}>Mon&ndash;Sat · 10 AM&ndash;6 PM IST</p>
          </div>

          {/* Link columns */}
          {columns.map(({ heading, items }) => (
            <div key={heading}>
              <h4 style={headingStyle}>{heading}</h4>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {items.map(({ label, href }) => (
                  <li key={label}>
                    {href.startsWith('http') ? (
                      <a href={href} target="_blank" rel="noreferrer" style={linkStyle} className="hover:underline">{label}</a>
                    ) : (
                      <Link href={href} style={linkStyle} className="hover:underline">{label}</Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Follow */}
          <div>
            <h4 style={headingStyle}>Follow</h4>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {social.map(({ label, href, icon }) => (
                <li key={label} className="flex items-center gap-4">
                  <Icon name={icon} />
                  <a href={href} target="_blank" rel="noreferrer" style={linkStyle} className="hover:underline">{label}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div
          className="mt-20 pt-8 flex flex-col md:flex-row items-center justify-between gap-4"
          style={{ borderTop: '1px solid #d8d5cf', fontFamily: 'var(--font-ui)', fontSize: '15px', fontWeight: '300', letterSpacing: '0.4px', color: '#262626' }}
        >
          <span>© {new Date().getFullYear()} Biahama. All rights reserved.</span>
          <span className="flex items-center gap-3">
            <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
            <span aria-hidden>•</span>
            <Link href="/terms" className="hover:underline">Terms &amp; Conditions</Link>
          </span>
          <span>Made with intention · India</span>
        </div>
      </div>
    </footer>
  )
}
