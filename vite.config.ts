import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const WORKER_ORIGIN = process.env.ADA_WORKER_ORIGIN ?? 'http://localhost:8787'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
  server: {
    port: 5173,
    // The Ada Worker does not send CORS headers today (routeAgentRequest is called
    // without a `cors` option), so a cross-origin call from :5173 to :8787 fails the
    // preflight. Proxying /agents keeps local dev same-origin. Leave VITE_API_BASE_URL
    // unset (or empty) to route through this proxy.
    proxy: {
      '/agents': {
        target: WORKER_ORIGIN,
        changeOrigin: true,
      },
    },
  },
})
