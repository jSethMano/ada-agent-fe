/**
 * Single source of truth for the facts printed on the page.
 *
 * These are read off ada-agent/src/index.ts and its wrangler.jsonc rather than
 * retyped from memory, so the page cannot quietly drift from the Worker.
 */
export const SITE = {
  /** Currently active in the Worker. The 70b fp8-fast model is commented out
   *  directly above it, kept as the fallback if scout regresses on tool calls. */
  model: '@cf/meta/llama-4-scout-17b-16e-instruct',
  previousModel: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',

  /** MAX_ITERATIONS in the router loop. */
  maxIterations: 5,

  agentsSdkVersion: '0.23.0',
} as const

/**
 * Source repositories, rendered in the masthead and footer.
 *
 * An entry with an empty `url` is skipped everywhere rather than rendered as a
 * dead link. Both call sites render nothing at all when no repo has a url, so
 * an unpublished repo degrades to a missing link instead of a 404 on a page
 * someone was specifically invited to look at.
 *
 * A private repo will still 404 for visitors. These have to be public.
 */
export interface Repo {
  label: string
  url: string
}

export const REPOS: readonly Repo[] = [
  { label: 'Worker and agent loop', url: 'https://github.com/jSethMano/ada-agent' },
  { label: 'This page', url: 'https://github.com/jSethMano/ada-agent-fe' },
]

export const PUBLISHED_REPOS = REPOS.filter((repo) => repo.url !== '')

export const STACK: ReadonlyArray<{ label: string; detail: string }> = [
  { label: 'Cloudflare Workers', detail: 'runtime' },
  { label: 'Durable Objects', detail: 'per-instance memory' },
  { label: 'Workers AI', detail: 'inference' },
  { label: 'agents SDK', detail: `v${SITE.agentsSdkVersion}` },
  { label: 'React + Vite', detail: 'this page' },
  { label: 'TanStack Query', detail: 'request state' },
  { label: 'Tailwind + shadcn/ui', detail: 'interface' },
]
