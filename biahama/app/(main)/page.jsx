import Link from 'next/link'
import Image from 'next/image'

export const metadata = {
  title: 'Biahama — Luxury Linen',
  description: 'Luxury linen clothing handcrafted in India.',
}

export default function HomePage() {
  return (
    <div className="relative w-full h-screen overflow-hidden bg-zinc-900">
      {/* Background Campaign Image */}
      <div className="absolute inset-0 w-full h-full">
        <Image
          src="https://res.cloudinary.com/dc30t7io2/image/upload/v1780574318/Gemini_Generated_Image_8otfaw8otfaw8otf_itwxgh.png"
          alt="Biahama campaign hero"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center pointer-events-none"
        />
        {/* Soft shadow overlay for text legibility */}
        <div className="absolute inset-0 bg-black/15" />
      </div>

      {/* Caption Overlay — Middle Left */}
      <div 
        className="absolute inset-y-0 left-0 flex flex-col justify-center z-10 text-white max-w-xl"
        style={{ paddingLeft: 'clamp(48px, 10vw, 144px)', paddingRight: '48px' }}
      >
        <h1
          className="mb-8 leading-[1.2]"
          style={{
            fontFamily: 'Cormorant Garamond, serif',
            fontWeight: 300,
            fontSize: 'clamp(2rem, 5vw, 3rem)',
            fontStyle: 'italic',
            color: '#ffffff',
          }}
        >
          Quiet forms<br />for modern movement.
        </h1>
        <div>
          <Link
            href="/shop"
            className="group inline-flex items-center gap-3 text-xs tracking-widest uppercase pb-1 hover:opacity-85 transition-opacity"
            style={{
              fontFamily: 'Jost, sans-serif',
              fontWeight: 400,
              color: '#ffffff',
              borderBottom: '1px solid #ffffff',
            }}
          >
            Step Inside
            <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
