import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

/*
 * Admin panel. It is built to be served at /admin, so every page address
 * stays the same as before (/admin, /admin/orders ...).
 *
 * Development: http://localhost:5174/admin
 *  - /api and /uploads go to the Express server (port 5000)
 *  - /images (logo, product photos) come from the store's Vite server
 *    (port 5173), so run the store too.
 */
export default defineConfig({
  base: '/admin/',
  plugins: [react()],
  server: {
    port: 5174,
    strictPort: true,
    open: '/admin/',
    proxy: {
      '/api': 'http://localhost:5000',
      '/uploads': 'http://localhost:5000',
      '/images': 'http://localhost:5173',
    },
  },
})
