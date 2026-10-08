import Link from 'next/link'
import { getImageProps } from 'next/image'
import { getHeroImages } from '@/lib/hero'

export default function CampaignHero({ layout, preview }) {
  const images = getHeroImages(layout)
  // A landscape photo covering a tall viewport needs enough pixels for its
  // rendered height, not just the narrow viewport width.
  const landscapeSizes = '(max-aspect-ratio: 16/9) 178svh, 100vw'
  const mobileSizes = images.mobile === images.desktop ? landscapeSizes : '100vw'
  const common = { alt: layout.heroImageAlt || 'The Biahama linen collection', fill: true }
  const { props: desktop } = getImageProps({ ...common, src: images.desktop, sizes: landscapeSizes })
  const { props: mobile } = getImageProps({ ...common, src: images.mobile, sizes: mobileSizes })
  const image = preview === 'mobile' ? mobile : desktop
  const Heading = preview ? 'h3' : 'h1'
  const focus = (value, fallback) => Number.isFinite(Number(value)) ? Math.max(0, Math.min(100, Number(value))) : fallback

  return (
    <section
      className="campaign-hero"
      data-preview={preview}
      aria-label={preview ? `${preview} hero preview` : 'The Biahama collection'}
      style={{
        '--hero-desktop-focus': `${focus(layout.heroFocalX, 65)}% ${focus(layout.heroFocalY, 25)}%`,
        '--hero-mobile-focus': `${focus(layout.heroMobileFocalX, 80)}% ${focus(layout.heroMobileFocalY, 25)}%`,
      }}
    >
      <picture>
        {!preview && <source media="(max-width: 767px)" srcSet={mobile.srcSet} sizes={mobileSizes} />}
        {/* One picture chooses the correct asset before download; no duplicate hidden images. */}
        <img {...image} alt={common.alt} className="campaign-hero-image" loading={preview ? 'lazy' : 'eager'} fetchPriority={preview ? 'auto' : 'high'} />
      </picture>
      <div className="campaign-hero-shade" aria-hidden="true" />
      <div className="campaign-hero-caption">
        <Heading>{layout.heroHeadline}</Heading>
        {preview
          ? <span className="campaign-hero-link">{layout.heroButtonText}<span aria-hidden="true">→</span></span>
          : <Link className="campaign-hero-link" href="/shop">{layout.heroButtonText}<span aria-hidden="true">→</span></Link>}
      </div>
    </section>
  )
}
