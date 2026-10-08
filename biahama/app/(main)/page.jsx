import Link from 'next/link'
import Image from 'next/image'
import { getSiteSettings } from '@/lib/site-settings'
import { STOREFRONT_COLLECTIONS } from '@/lib/collections'
import CampaignHero from '@/components/layout/CampaignHero'

export const metadata = {
  title: { absolute: 'Biahama — Luxury Linen' },
  alternates: { canonical: '/' },
  description: 'Luxury linen clothing handcrafted in India.',
}

export default async function HomePage() {
  const settings = await getSiteSettings()

  return (
    <div>
      <CampaignHero layout={settings.layout} />
    <section className="home-collections">
      <div className="home-section-intro"><p className="eyebrow">{settings.layout.collectionEyebrow}</p><h2>{settings.layout.collectionHeadline}</h2><p>{settings.layout.collectionDescription}</p></div>
      <div className="home-collection-grid">{STOREFRONT_COLLECTIONS.map(collection => <Link className="home-collection" href={'/shop?cat=' + collection.slug} key={collection.slug}><div><Image src={collection.image} alt={collection.alt} width={600} height={800} sizes="(max-width: 767px) 50vw, 25vw" /></div><span>{collection.name}<span aria-hidden="true">↗</span></span></Link>)}</div>
    </section>
    <section className="home-story"><p className="eyebrow">{settings.layout.storyEyebrow}</p><h2>{settings.layout.storyHeadline}</h2><p>{settings.layout.storyDescription}</p><Link className="text-action" href="/about">Discover our story →</Link></section>
    <section className="home-services" aria-label="Customer services"><Link href="/sizing"><p className="eyebrow">Finding your fit</p><h3>Made for your everyday.</h3><span>Explore the size guide →</span></Link><Link href="/shipping"><p className="eyebrow">Delivered with care</p><h3>A little closer to you.</h3><span>Shipping within India →</span></Link><Link href="/contact"><p className="eyebrow">A personal conversation</p><h3>We’re here for you.</h3><span>Speak to customer care →</span></Link></section>
    </div>
  )
}
