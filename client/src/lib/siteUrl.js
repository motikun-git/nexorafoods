import 'server-only'
import { headers } from 'next/headers'

// The public address of the store, e.g. https://www.yourshop.com
// Set SITE_URL on the live server; otherwise it is worked out from the request.
export async function getSiteUrl() {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, '')
  const requestHeaders = await headers()
  const host = requestHeaders.get('x-forwarded-host') || requestHeaders.get('host') || 'localhost:5173'
  const protocol = requestHeaders.get('x-forwarded-proto') || (host.startsWith('localhost') ? 'http' : 'https')
  return `${protocol}://${host}`
}
