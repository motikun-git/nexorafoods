// Address of the admin panel (a separate app, see ../admin).
// - Production: served by the same server at /admin.
// - Development: runs on its own Vite server (port 5174).
// Set NEXT_PUBLIC_ADMIN_URL to override.
export const ADMIN_URL =
  process.env.NEXT_PUBLIC_ADMIN_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:5174/admin' : '/admin')
