// Address of the admin panel (a separate app, see ../admin).
// - Production: served by the same server at /admin.
// - Development: runs on its own Vite server (port 5174).
// Set VITE_ADMIN_URL to override.
export const ADMIN_URL = import.meta.env.VITE_ADMIN_URL || (import.meta.env.DEV ? 'http://localhost:5174/admin' : '/admin')
