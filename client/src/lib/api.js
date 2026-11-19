// One place for talking to the backend.
// "/api/..." is forwarded to the Express server by next.config.mjs.
// Set NEXT_PUBLIC_API_URL only if the API is on a different address.
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''

export class ApiError extends Error {
  constructor(message, status, details) {
    super(message)
    this.status = status
    this.details = details
  }
}

export async function apiRequest(path, { method = 'GET', body, signal } = {}) {
  let response
  try {
    response = await fetch(`${BASE_URL}/api${path}`, {
      method,
      signal,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        // Required by the server for every change (CSRF protection).
        'X-Requested-With': 'fetch',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new ApiError('Cannot reach the server. Please check your connection.', 0)
  }

  let data = null
  try {
    data = await response.json()
  } catch (error) {
    // Cancelled while reading (the page moved on): not a real failure.
    if (error.name === 'AbortError' || signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    // otherwise: not JSON
  }

  if (!response.ok || !data?.success) {
    throw new ApiError(data?.message || `Request failed (${response.status})`, response.status, data?.details)
  }
  return data
}

export const apiGet = (path, options) => apiRequest(path, options)
