# ada-agent-fe

Front end for **Chak**, an internal-helpdesk agent running on Cloudflare Workers, presented as an
orange-and-white office cat. A single scrolled page: a live chat console with a visible tool-call
trace, a list of everything he can do, plus documentation of the architecture behind it.

**Live: [chak.joshuaseth11.workers.dev](https://chak.joshuaseth11.workers.dev/).** The Worker and its end-to-end eval live in [ada-agent](https://github.com/jSethMano/ada-agent).

The point of the page is the trace. Chak is a router agent that decides whether a question needs
data, dispatches tool calls to sub-agents in separate Durable Objects, folds the results back into
the message list, and runs the model again. Every one of those calls is rendered, with the real
request and the real response.

---

## Running it locally

```bash
npm install && npm run dev
```

Vite serves on <http://localhost:5173>. This starts the front end only.

The Chak Worker (repo: `ada-agent`) is a separate service that you run (or deploy) on its own. Point this app at it with
`ADA_WORKER_ORIGIN`, which defaults to `http://localhost:8787`:

```bash
ADA_WORKER_ORIGIN=https://ada-agent.example.workers.dev npm run dev
```

If the Worker is not reachable, the page still runs and every question shows an inline
Worker-unreachable error with a retry, rather than failing silently.

> When running the Worker locally, the port has to match `ADA_WORKER_ORIGIN`. `wrangler dev`
> silently picks the next free port when the default is taken, which leaves this app proxying to
> nothing and every question returning 502. Pass `--port` explicitly.

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

`.env` holds the committed defaults. Create `.env.local` (gitignored) to point at a different
environment without touching a tracked file; it wins over `.env`.

| Variable | Default | Meaning |
| --- | --- | --- |
| `ADA_WORKER_ORIGIN` | `http://localhost:8787` | Dev-proxy target. Server-side only, never shipped to the client. Ignored when `VITE_API_BASE_URL` is set. |
| `VITE_API_BASE_URL` | `""` (same origin) | Prefix the browser puts on the agent call. Empty means "call my own origin", which is what routes through the proxy. Inlined at build time. |

### Switching environments

**Through the proxy** (default). The browser calls this app's origin and Vite forwards `/agents`.
Same-origin, so no CORS is needed, and it works against a deployed Worker just as well as a local
one. Dev server only.

```bash
# .env.local
ADA_WORKER_ORIGIN=https://ada-agent.<your-subdomain>.workers.dev
VITE_API_BASE_URL=
```

**Direct from the browser.** The proxy is skipped entirely. Requires CORS on the Worker, and is the
only option for a production build since there is no dev server to proxy through.

```bash
# .env.local
VITE_API_BASE_URL=https://ada-agent.<your-subdomain>.workers.dev
```

Restart the dev server after editing either file. `vite.config.ts` reads them through Vite's
`loadEnv` at startup, not per request.

---

## Backend contract

```
POST /agents/chak/{instance}
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

One light theme, locked. Three type registers with one rule each: **Geist Pixel** for authored
prose (headlines, Chak's answers, section kickers), **Geist** for interface, **Geist Mono** for
anything the machine emitted. Marmalade `#A84A0C` is the only accent and has exactly four jobs:
links, the Send button, the multi-pass iteration count, and focus rings. Every radius is 2px.

Chak himself is a 16×16 pixel sprite, rendered only at multiples of 16px. His character is a tone,
kept professional: it lives in the page chrome and never in the trace or in his answers. Full brand
spec: [`docs/design/chak-brand.md`](docs/design/chak-brand.md).

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

## Deployed

**<https://chak.joshuaseth11.workers.dev>**

Two Workers, one public origin. The browser only ever talks to `chak`; the agent is reached over an
internal service binding, so CORS never enters the picture.

```
browser ──> chak (Worker + static assets)
              │
              ├── /agents/*        ──(service binding)──> ada-agent ──> Chak DO ──> Workers AI
              │                                                     └──> ItAgent DO
              └── everything else  ──> dist/
```

This is the production equivalent of the dev proxy, so dev and production behave identically and
`VITE_API_BASE_URL` stays empty in both.

| Worker | Config | Role |
| --- | --- | --- |
| `chak` | `wrangler.jsonc` here | Serves `dist/`, forwards `/agents/*` |
| `ada-agent` | sibling repo | Durable Objects, tool loop, Workers AI |

### Deploying changes

The agent must exist before the service binding can resolve, so on a first deploy it goes first.

```bash
cd ../ada-agent && npx wrangler deploy
```

Then the front end, which builds and uploads in one step:

```bash
npm run deploy
```

### How the routing works

`assets.run_worker_first` is set to `["/agents/*"]`. Without it, `not_found_handling:
single-page-application` would answer `/agents/*` with `index.html` and `worker/index.ts` would
never run. Scoping it to `/agents/*` means static files are served straight from the asset worker
with no script in front of them.

After changing `wrangler.jsonc`, regenerate binding types:

```bash
npm run cf-typegen
```

### Why not Pages plus CORS

Pages would leave the browser calling a second origin, which means getting CORS right on the Worker
including the preflight that a JSON POST triggers, plus setting `VITE_API_BASE_URL` at build time
and rebuilding whenever it changes. The service binding removes all of that and keeps the agent off
the public path.
