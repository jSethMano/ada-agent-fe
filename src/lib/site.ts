/**
 * Single source of truth for the facts printed on the page.
 *
 * These are read off ada-agent/src/index.ts and its wrangler.jsonc rather than
 * retyped from memory, so the page cannot quietly drift from the Worker.
 */
export const SITE = {
  /**
   * Repository link, rendered as "Source" in the masthead and footer.
   *
   * Empty on purpose until the repo is public. A link that 404s on a page
   * someone was invited to look at is worse than no link, so both call sites
   * hide themselves when this is empty rather than shipping a dead one.
   */
  githubUrl: '' as string,

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
