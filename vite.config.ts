import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // The third argument is the prefix filter. Passing '' loads every key in the
  // .env files, not just VITE_*, which is what lets ADA_WORKER_ORIGIN (a
  // server-only value) come from .env. `process.env` alone would not see it:
  // Vite does not load .env files into process.env.
  const env = loadEnv(mode, import.meta.dirname, '')

  const workerOrigin = env.ADA_WORKER_ORIGIN || 'http://localhost:8787'

  // An empty VITE_API_BASE_URL means the app calls its own origin, so the dev
  // server has to forward /agents to the Worker. If it is set, the browser
  // calls the Worker directly and the proxy would never be hit.
  const useProxy = !env.VITE_API_BASE_URL

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { '@': path.resolve(import.meta.dirname, './src') },
    },
    server: {
      port: 5173,
      proxy: useProxy
        ? {
            // The Worker does not send CORS headers today (routeAgentRequest is
            // called without a `cors` option), so a direct cross-origin call
            // from :5173 fails its preflight. Proxying keeps dev same-origin,
            // and works against a deployed Worker just as well as a local one.
            '/agents': { target: workerOrigin, changeOrigin: true, secure: true },
          }
        : undefined,
    },
  }
})
