// Which address parts the Shop page sends to the API. Shared by the server
// (first load) and the browser, so both ask for exactly the same products.
export const PAGE_SIZE = 12
export const API_KEYS = ['category', 'mode', 'search', 'minPrice', 'maxPrice', 'inStock', 'sort', 'page', 'featured']

// getParam(key) -> the value in the address, or null
export function buildProductsQuery(getParam) {
  const query = new URLSearchParams()
  for (const key of API_KEYS) {
    const value = getParam(key)
    if (value) query.set(key, value)
  }
  query.set('limit', String(PAGE_SIZE))
  return query.toString()
}
