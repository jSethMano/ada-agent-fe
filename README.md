# ada-agent-fe

Front end for **Ada**, an internal-helpdesk agent running on Cloudflare Workers. A single scrolled
page: a live chat console with a visible tool-call trace, plus documentation of the architecture
behind it.

The point of the page is the trace. Ada is a router agent that decides whether a question needs
data, dispatches tool calls to sub-agents in separate Durable Objects, folds the results back into
the message list, and runs the model again. Every one of those calls is rendered, with the real
request and the real response.

---

## Running it locally

This app needs the Worker running alongside it. One command starts both:

```bash
npm install && npm run dev
```

- **web** on <http://localhost:5173>
- **worker** on `http://localhost:8787`, from the sibling repo [`ada-agent`](../ada-agent)

Ctrl-C stops both. Workers AI bindings always reach remote resources, so the Worker needs a
Cloudflare login and may incur usage.

| Script | Does |
| --- | --- |
| `npm run dev` | Both processes |
| `npm run dev:web` | Vite only. Every question shows the Worker-unreachable error state. |
| `npm run dev:worker` | Worker only |

If the Worker lives somewhere other than `../ada-agent`:

```bash
ADA_WORKER_DIR=/path/to/ada-agent npm run dev
```

### Why the Worker port is pinned

`scripts/dev-worker.sh` always passes `--port 8787` because `vite.config.ts` proxies `/agents`
there. Plain `wrangler dev` silently picks the next free port when 8787 is taken, which leaves the
proxy pointing at nothing and every question failing with a 502. Pinning it turns that into an
obvious "address in use" error instead.

### Why there is a proxy

`ada-agent` calls `routeAgentRequest(request, env)` without a `cors` option, so the Worker sends no
CORS headers and a direct call from `:5173` to `:8787` fails its preflight. Rather than require a
backend change to develop, `vite.config.ts` proxies `/agents` to the Worker so local dev is
same-origin.

Point the proxy somewhere else with an env var:

```bash
ADA_WORKER_ORIGIN=http://localhost:9000 npm run dev
```

---

## Configuration

| Variable | Default | Meaning |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `""` (same origin) | Prefix for the agent call. Empty routes through the Vite proxy. |
| `ADA_WORKER_ORIGIN` | `http://localhost:8787` | Proxy target. Build-time only, not shipped to the client. |
| `ADA_WORKER_DIR` | `../ada-agent` | Where `npm run dev` looks for the Worker repo. |
| `ADA_WORKER_PORT` | `8787` | Port the Worker binds to. Change `ADA_WORKER_ORIGIN` to match. |

Copy `.env.example` to `.env.local` to override. To bypass the proxy and call the Worker directly,
set `VITE_API_BASE_URL=http://localhost:8787` **and** enable CORS on the Worker (below).

---

## Backend contract

```
POST /agents/ada/{instance}
{ "question": string }
```

Three response shapes, all handled:

| Status | Body | Rendered as |
| --- | --- | --- |
| `200` | `{ answer, iterations, trace[] }` | A turn with its trace above the answer |
| `400` | `{ error }` | Inline error with a retry |
| `500` | `{ error, trace[] }` | Loop exceeded `MAX_ITERATIONS`; the partial trace is still shown |

`{instance}` is the Durable Object memory boundary. The app generates a readable id
(`visitor-7fq2k`) on first visit and keeps it in `localStorage`. It is displayed in the console
header rather than hidden, because the path segment *is* the architecture. "New conversation" mints
a new id, which is what resets memory.

---

## Layout

```
src/
  routes/           the single page
  features/chat/    console, transcript, trace, composer, session + ask hooks
  components/       masthead, builder's note, architecture diagram, status, footer
  components/ui/    shadcn primitives (button, textarea), re-tokenized
  lib/api/          typed client and wire types
  lib/site.ts       facts printed on the page, read off the Worker source
```

### Design notes

One light theme, locked. Three type registers with one rule: **Newsreader** for authored prose
(headlines, Ada's answers), **Geist** for interface, **Geist Mono** for anything the machine
emitted. Ultramarine `#2440C8` is the only accent and has exactly four jobs: links, the Send button,
the multi-pass iteration count, and focus rings. Every radius is 2px.

`dark:` is bound to a class variant that is never applied. Without that, Tailwind v4 falls back to
`prefers-color-scheme` and the `dark:*` utilities inside the shadcn primitives fire for visitors
whose OS is in dark mode, giving them dark inputs on a light page.

Motion is three CSS transitions: the trace disclosure, the in-flight indicator, and button press
feedback. No animation library. Everything collapses under `prefers-reduced-motion`.

---

## Known gaps

- The Worker returns a flat `trace` with no per-entry iteration index, so tool calls are numbered in
  call order and `iterations` is reported separately instead of being faked into groups. Adding an
  `iteration` field to each trace entry in `ada-agent` would let the UI group passes properly.
- No streaming. The Worker returns the whole turn at once. The transcript is built so a pending turn
  and its answered state are the same row, so streaming can be added without restructuring.
- `SITE.githubUrl` in `src/lib/site.ts` is a placeholder. Set it before sharing this.

---

## Deploying to Cloudflare

Not executed here. These are the steps.

### 1. Enable CORS on the Worker

Production is cross-origin, so the proxy no longer helps. In `ada-agent/src/index.ts`:

```ts
export default {
  fetch: async (request, env) =>
    (await routeAgentRequest(request, env, {
      cors: { origin: ['https://your-pages-domain.pages.dev'] },
    })) ?? new Response('Not found', { status: 404 }),
} satisfies ExportedHandler<Env>
```

Check the option shape against the `agents` version in `ada-agent/package.json` before relying on
it; passing `cors: true` to allow all origins is the permissive fallback.

### 2. Build with the Worker URL

```bash
VITE_API_BASE_URL=https://ada-agent.<your-subdomain>.workers.dev npm run build
```

Output lands in `dist/`.

### 3. Publish

Cloudflare Pages, direct upload:

```bash
npx wrangler pages deploy dist --project-name ada-agent-fe
```

Or via Workers Static Assets, by adding to a `wrangler.jsonc` in this repo:

```jsonc
{
  "name": "ada-agent-fe",
  "compatibility_date": "2026-09-18",
  "assets": { "directory": "./dist", "not_found_handling": "single-page-application" }
}
```

then `npx wrangler deploy`.

Set `VITE_API_BASE_URL` as a build-time variable in the Pages dashboard for git-triggered builds.
It is inlined at build time, so changing it requires a rebuild, not just a redeploy.

### Alternative: same-origin, no CORS

Serve this app from a Worker that also routes `/agents/*` to the agent handler. Same origin means
no CORS and no `VITE_API_BASE_URL`. More wiring, fewer moving parts in production.
