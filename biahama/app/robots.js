export default function robots() {
  return { rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/api', '/account', '/checkout', '/cart', '/orders', '/auth', '/register', '/forgot-password', '/reset-password'] }, sitemap: 'https://www.biahama.com/sitemap.xml' }
}
