import Link from 'next/link'

const SECTIONS = [
  { category: 'Kurtas',   slug: 'kurtas',   oneliner: 'The art of the everyday' },
  { category: 'Tunics',   slug: 'tunics',   oneliner: 'Effortless from morning to evening' },
  { category: 'Shirts',   slug: 'shirts',   oneliner: 'Considered simplicity' },
  { category: 'Dresses',  slug: 'dresses',  oneliner: 'Worn like a second skin' },
  { category: 'Sets',     slug: 'sets',     oneliner: 'Dressed in one intention' },
  { category: 'Trousers', slug: 'trousers', oneliner: 'The quiet power of a good trouser' },
  { category: 'Jackets',  slug: 'jackets',  oneliner: 'Layered with purpose' },
  { category: 'Wraps',    slug: 'wraps',    oneliner: 'Fluid. Free. Yours.' },
]

export const metadata = {
  title: 'Biahama — Luxury Linen',
  description: 'Luxury linen clothing handcrafted in India.',
}

export default function HomePage() {
  return (
    <div>
      {SECTIONS.map((section, i) => (
        <Link key={section.slug} href={`/shop/${section.slug}`} className="block group">
          {/* One-liner row */}
          <div
            className="flex items-center justify-between"
            style={{
              paddingLeft: 48,
              paddingRight: 48,
              paddingTop: 18,
              paddingBottom: 18,
              borderBottom: '1px solid var(--border)',
            }}
          >
            {/* Left: stacked — evocative one-liner + small grey category name */}
            <div className="flex flex-col gap-1">
              <span
                style={{
                  fontFamily: 'Cormorant Garamond, serif',
                  fontWeight: 300,
                  fontStyle: 'italic',
                  fontSize: 'clamp(1rem, 2vw, 1.25rem)',
                  color: 'var(--black)',
                  lineHeight: 1.2,
                }}
              >
                {section.oneliner}
              </span>
              <span
                style={{
                  fontFamily: 'Jost, sans-serif',
                  fontWeight: 300,
                  fontSize: 11,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: 'var(--gray)',
                }}
              >
                {section.category}
              </span>
            </div>

            {/* Right: arrow */}
            <span
              className="transition-transform duration-300 group-hover:translate-x-1"
              style={{
                fontFamily: 'Jost, sans-serif',
                fontSize: '1.25rem',
                color: 'var(--black)',
                marginLeft: 24,
              }}
            >
              →
            </span>
          </div>

          {/* Campaign image — 75vh */}
          <div
            className="relative overflow-hidden"
            style={{ height: '75vh', background: i % 2 === 0 ? 'var(--light)' : 'var(--bg)' }}
          >
            {/* Placeholder — replace with <Image> from Cloudinary */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span
                className="select-none pointer-events-none"
                style={{
                  fontFamily: 'Cormorant Garamond, serif',
                  fontWeight: 300,
                  fontStyle: 'italic',
                  fontSize: 'clamp(4rem, 12vw, 9rem)',
                  color: 'var(--border)',
                  lineHeight: 1,
                  letterSpacing: '-0.02em',
                }}
              >
                {section.category}
              </span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}
