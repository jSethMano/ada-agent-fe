/**
 * Production edge entry point.
 *
 * In development, vite.config.ts proxies /agents to the Ada Worker so the
 * browser stays same-origin and never needs CORS. This is the production
 * equivalent: one origin serves the built SPA, and /agents/* is forwarded to
 * the ada-agent Worker over a service binding.
 *
 * The forward is an internal Cloudflare call, not a second trip over the
 * public internet, so the agent Worker never has to answer a cross-origin
 * preflight and the browser only ever sees this origin.
 *
 * Routing note: `assets.run_worker_first` in wrangler.jsonc limits this script
 * to /agents/*. Every other path is served directly by the asset worker and
 * never reaches this code. The ASSETS fallback below is a safety net for a
 * misconfigured route, not the normal path.
 */
export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname.startsWith('/agents/')) {
      return env.ADA.fetch(request)
    }

    return env.ASSETS.fetch(request)
  },
} satisfies ExportedHandler<Env>
