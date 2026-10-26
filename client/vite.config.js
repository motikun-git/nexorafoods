import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // During development, "/api/..." requests are forwarded to the Express
    // server, so the browser sees one origin (no CORS or cookie problems).
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
})
