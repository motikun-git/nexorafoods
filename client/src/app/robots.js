import { getSiteUrl } from '../lib/siteUrl.js'

// Tells search engines what to read. Private pages are left out.
export default async function robots() {
  const siteUrl = await getSiteUrl()
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/account', '/checkout', '/orders', '/cart', '/login', '/register', '/api'] },
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
