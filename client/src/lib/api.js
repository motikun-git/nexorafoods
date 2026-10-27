// One place for talking to the backend.
// In development, Vite forwards /api to localhost:5000 (see vite.config.js).
// In production, set VITE_API_URL (e.g. https://api.yourstore.com).
const BASE_URL = import.meta.env.VITE_API_URL || ''

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
  } catch {
    // not JSON
  }

  if (!response.ok || !data?.success) {
    throw new ApiError(data?.message || `Request failed (${response.status})`, response.status, data?.details)
  }
  return data
}

export const apiGet = (path, options) => apiRequest(path, options)

// Uploads one image file (admin only). Returns the image URL.
export async function uploadImage(file) {
  const form = new FormData()
  form.append('image', file)
  let response
  try {
    response = await fetch(`${BASE_URL}/api/admin/uploads`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'X-Requested-With': 'fetch' },
      body: form,
    })
  } catch {
    throw new ApiError('Cannot reach the server. Please check your connection.', 0)
  }
  const data = await response.json().catch(() => null)
  if (!response.ok || !data?.success) throw new ApiError(data?.message || 'Upload failed', response.status)
  return data.data.url
}
