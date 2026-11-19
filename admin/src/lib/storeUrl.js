// Address of the storefront (the customer website), used by "View store" links.
// - Production: the store and the admin panel are served by the same server,
//   so the store is simply "/".
// - Development: the store runs on its own Vite server (port 5173).
// Set VITE_STORE_URL to override (e.g. when the store is on another domain).
const STORE_URL = import.meta.env.VITE_STORE_URL || (import.meta.env.DEV ? 'http://localhost:5173' : '')

// "/product/rice" -> "http://localhost:5173/product/rice" (dev) or "/product/rice" (production)
export function storeUrl(path = '/') {
  return `${STORE_URL}${path}`
}
