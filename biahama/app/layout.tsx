import type { Metadata } from 'next'
import { Cormorant_Garamond, Jost } from 'next/font/google'
import Providers from '@/components/providers'
import { getSiteSettings, buildThemeCss, googleFontsUrl } from '@/lib/site-settings'
import './globals.css'

const cormorant = Cormorant_Garamond({
  variable: '--font-cormorant',
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  style: ['normal', 'italic'],
})

const jost = Jost({
  variable: '--font-jost',
  subsets: ['latin'],
  weight: ['300', '400', '500'],
})

export const metadata: Metadata = {
  title: 'Biahama — Luxury Linen',
  description: 'Luxury linen clothing crafted in India.',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Load the admin's saved theme choices (colors, sizes, fonts).
  // getSiteSettings is crash-safe: if the database is down it
  // returns the defaults and the site renders exactly as designed.
  const settings = await getSiteSettings()
  const themeCss = buildThemeCss(settings.theme)
  const fontsUrl = googleFontsUrl(settings.theme)

  return (
    <html lang="en" className={`${cormorant.variable} ${jost.variable}`}>
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
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
