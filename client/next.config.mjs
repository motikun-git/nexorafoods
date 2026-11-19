/*
 * Next.js settings for the store.
 *
 * The browser only ever talks to this one address. Next.js forwards:
 *   /api/...      -> Express API     (API_URL, default http://localhost:5000)
 *   /uploads/...  -> Express API     (product photos uploaded in the admin)
 *   /admin/...    -> admin panel     (ADMIN_ORIGIN; on your PC the admin's
 *                                     own Vite server, online the Express server)
 * so login cookies work without any cross-site setup.
 */
const API_URL = process.env.API_URL || 'http://localhost:5000'
const isDev = process.env.NODE_ENV === 'development'
const ADMIN_ORIGIN = process.env.ADMIN_ORIGIN || (isDev ? 'http://localhost:5174' : API_URL)

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  async rewrites() {
    return [
      { source: '/api/:path*', destination: `${API_URL}/api/:path*` },
      { source: '/uploads/:path*', destination: `${API_URL}/uploads/:path*` },
      { source: '/admin', destination: `${ADMIN_ORIGIN}/admin` },
      { source: '/admin/:path*', destination: `${ADMIN_ORIGIN}/admin/:path*` },
    ]
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ]
  },
}

export default nextConfig
