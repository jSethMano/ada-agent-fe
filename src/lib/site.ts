/**
 * Single source of truth for the facts printed on the page.
 *
 * These are read off ada-agent/src/index.ts and its wrangler.jsonc rather than
 * retyped from memory, so the page cannot quietly drift from the Worker.
 */
export const SITE = {
  /** Replace with the real repository before sending this to anyone. */
  githubUrl: 'https://github.com/sethmano/ada-agent',

  /** Currently active in the Worker. The 70b fp8-fast model is commented out
   *  directly above it, kept as the fallback if scout regresses on tool calls. */
  model: '@cf/meta/llama-4-scout-17b-16e-instruct',
  previousModel: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',

  /** MAX_ITERATIONS in the router loop. */
  maxIterations: 5,

  agentsSdkVersion: '0.23.0',
} as const

export const STACK: ReadonlyArray<{ label: string; detail: string }> = [
  { label: 'Cloudflare Workers', detail: 'runtime' },
  { label: 'Durable Objects', detail: 'per-instance memory' },
  { label: 'Workers AI', detail: 'inference' },
  { label: 'agents SDK', detail: `v${SITE.agentsSdkVersion}` },
  { label: 'React + Vite', detail: 'this page' },
  { label: 'TanStack Query', detail: 'request state' },
  { label: 'Tailwind + shadcn/ui', detail: 'interface' },
]
