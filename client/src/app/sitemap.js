import { getSiteUrl } from '../lib/siteUrl.js'
import { serverGet } from '../lib/serverApi.js'

const MAX_PAGES = 50 // 48 products per page -> up to 2,400 products

// List of public pages for search engines: main pages, every category and
// every product. Built fresh from the API each time it is requested.
export default async function sitemap() {
  const siteUrl = await getSiteUrl()
  const entries = ['', '/shop', '/about', '/contact'].map((path) => ({ url: `${siteUrl}${path}` }))

  const tree = (await serverGet('/categories/tree')).body?.data || []
  const walk = (nodes) => {
    for (const node of nodes) {
      entries.push({ url: `${siteUrl}/shop?category=${encodeURIComponent(node.slug)}` })
      walk(node.children || [])
    }
  }
  walk(tree)

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const body = (await serverGet(`/products?limit=48&page=${page}`)).body
    for (const product of body?.data || []) {
      entries.push({ url: `${siteUrl}/product/${product.slug}`, lastModified: product.updatedAt || undefined })
    }
    if (!body || page >= (body.pagination?.totalPages || 1)) break
  }
  return entries
}
