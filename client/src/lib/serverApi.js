import 'server-only'

// Address of the Express API, used when Next.js builds a page on the server.
// (In the browser, "/api/..." is forwarded to it by next.config.mjs.)
export const API_URL = process.env.API_URL || 'http://localhost:5000'

/*
 * GET from the API while rendering on the server.
 * Never throws: returns { status, body }. body is null when it failed, and
 * the page then loads the data in the browser instead (same as before).
 */
export async function serverGet(path) {
  try {
    const response = await fetch(`${API_URL}/api${path}`, {
      cache: 'no-store', // always fresh: prices, stock and settings change
      headers: { Accept: 'application/json' },
    })
    const body = await response.json().catch(() => null)
    if (!response.ok || !body?.success) return { status: response.status, body: null }
    return { status: response.status, body }
  } catch {
    return { status: 0, body: null }
  }
}
