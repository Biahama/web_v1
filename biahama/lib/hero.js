export const DEFAULT_HERO_IMAGE = 'https://res.cloudinary.com/dc30t7io2/image/upload/w_1920,c_scale,q_auto,f_auto/v1781048357/biahama/biahama_homepage_hero_v2.jpg'

// Match the image host supported by the storefront and admin uploads.
export function isHeroImageUrl(value) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && url.hostname === 'res.cloudinary.com' &&
      !url.username && !url.password && !url.port &&
      /^\/[^/]+\/image\/upload\/.+/.test(url.pathname)
  } catch {
    return false
  }
}

export function getHeroImages(layout) {
  const desktop = isHeroImageUrl(layout.heroDesktopImage) ? layout.heroDesktopImage : DEFAULT_HERO_IMAGE
  return { desktop, mobile: isHeroImageUrl(layout.heroMobileImage) ? layout.heroMobileImage : desktop }
}
