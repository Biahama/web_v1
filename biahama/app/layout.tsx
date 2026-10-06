import type { Metadata } from 'next'
import { Cormorant_Garamond, DM_Sans } from 'next/font/google'
import Script from 'next/script'
import Providers from '@/components/providers'
import PageViewTracker from '@/components/analytics/PageViewTracker'
import { getSiteSettings, buildThemeCss, googleFontsUrl } from '@/lib/site-settings'
import './globals.css'

const cormorant = Cormorant_Garamond({
  variable: '--font-cormorant',
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  style: ['normal', 'italic'],
})

const dmSans = DM_Sans({
  variable: '--font-dm-sans',
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'],
})

export const metadata: Metadata = {
  metadataBase: new URL('https://www.biahama.com'),
  title: { default: 'Biahama — Luxury Linen', template: '%s | Biahama' },
  description: 'Luxury linen clothing crafted in India.',
  openGraph: { title: 'Biahama — Luxury Linen', description: 'Luxury linen clothing crafted in India.', siteName: 'Biahama', locale: 'en_IN', type: 'website', images: [{ url: 'https://res.cloudinary.com/dc30t7io2/image/upload/w_1200,h_630,c_fill,q_auto,f_auto/v1781048357/biahama/biahama_homepage_hero_v2.jpg', width: 1200, height: 630, alt: 'Biahama linen collection' }] },
  twitter: { card: 'summary_large_image' },
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Load the admin's saved theme choices (colors, sizes, fonts).
  // getSiteSettings is crash-safe: if the database is down it
  // returns the defaults and the site renders exactly as designed.
  const settings = await getSiteSettings()
  const themeCss = buildThemeCss(settings.theme)
  const fontsUrl = googleFontsUrl(settings.theme)

  return (
    <html lang="en" className={`${cormorant.variable} ${dmSans.variable}`}>
      <body>
        {/*
          These two tags "paint" the admin's theme choices over the
          built-in design defaults:
          - <link>  loads any non-default Google Fonts they picked
          - <style> overrides the CSS variables (colors, sizes, fonts)
          When nothing was customized, both are empty and nothing renders.
        */}
        {fontsUrl && <link rel="stylesheet" href={fontsUrl} />}
        {themeCss && <style id="theme-overrides" dangerouslySetInnerHTML={{ __html: themeCss }} />}
        {/* Counts page views for the admin Analytics page. Invisible. */}
        <PageViewTracker />
        {/*
          Microsoft Clarity = FREE heatmaps and session recordings.
          Watch real (anonymous) visitors browse your shop at
          clarity.microsoft.com. Only loads if you've set the
          NEXT_PUBLIC_CLARITY_PROJECT_ID environment variable.
        */}
        {process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID && (
          <Script
            id="microsoft-clarity"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                (function(c,l,a,r,i,t,y){
                  c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                  t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                  y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
                })(window, document, "clarity", "script", "${process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID}");
              `,
            }}
          />
        )}
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
