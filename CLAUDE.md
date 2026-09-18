# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — Vite dev server on http://localhost:5173. Proxies `/agents` to the Ada Worker.
- `npm run build` — `tsc -b && vite build`. Type-checks the whole project then emits to `dist/`.
- `npm run lint` — `oxlint` (config in `.oxlintrc.json`; enforces `react/rules-of-hooks` and `react/only-export-components`).
- `npm run preview` — serves the built `dist/` locally.

There is no test runner in this repo.

### Worker coupling

This app is only the front end for the Ada Worker (`ada-agent`, a separate repo). Local dev requires the Worker running on the port set by `ADA_WORKER_ORIGIN` (default `http://localhost:8787`). `wrangler dev` silently picks the next free port when the default is taken — pass `--port 8787` explicitly, otherwise every request returns 502 through the Vite proxy.

### Environment variables

- `VITE_API_BASE_URL` (client, build-time) — prefix for the `/agents/ada/{instance}` call. Empty (default) routes through the Vite proxy for same-origin dev. Set to the Worker URL for production builds; inlined at build time, so changes require a rebuild.
- `ADA_WORKER_ORIGIN` (dev only, read by `vite.config.ts`) — proxy target. Never shipped to the client.

## Architecture

Single-page React 19 + Vite app. One route (`AdaPage`), no router. The page's whole purpose is to render the Ada agent's tool-call trace, so the wire contract and how traces flow through state matter more than the component tree.

### Wire contract (source of truth: `src/lib/api/types.ts`)

```
POST /agents/ada/{instance}    body: { question }
```

The `{instance}` path segment IS the Durable Object memory boundary in the Worker. It is deliberately surfaced in the console header rather than hidden — printing it teaches the architecture, and "New conversation" minting a new id demonstrates it in reverse. Ids are generated (no name prompt) and persisted in `localStorage` under `ada.instance`.

Three response shapes, all handled by `ask()` in `src/lib/api/client.ts`:

| Status | Body | Behavior |
| --- | --- | --- |
| 200 | `{ answer, iterations, trace[] }` | Turn resolved |
| 400 | `{ error }` | Inline error with retry |
| 500 | `{ error, trace[] }` | Loop exceeded `MAX_ITERATIONS`; **partial trace is still rendered** |

Gateway failures (502/503/504 with no JSON body — typical for a dead Worker upstream) are re-messaged as "Worker is not responding" rather than surfaced as raw status codes. All non-2xx and transport failures throw `AdaError`, which carries the partial trace so the UI can still show the work.

### State flow

- `useSession()` (`src/features/chat/use-session.ts`) — owns the instance id, persists to `localStorage`, exposes `resetSession()`.
- `useAsk(instance)` (`src/features/chat/use-ask.ts`) — owns the ordered, append-only transcript in local state. Wraps `ask()` in a TanStack Query mutation. **The pending row and the answered row are the same `Turn` object** — the row is appended as `pending` on submit, then patched in place on success/failure. This is deliberate: the transcript never jumps, and streaming can be added later without restructuring.
- `App.tsx` — TanStack Query is configured with `retry: false` for mutations. Failed agent turns must surface to the visitor immediately with a retry they choose, not be silently repeated.

Client-side elapsed time is measured with `performance.now()` and attached to `AdaError` on failure so failed turns still report honestly.

### Layout

```
src/
  routes/ada-page.tsx           the single page
  features/chat/                console, transcript, trace, composer, session + ask hooks
  components/                   masthead, builder's note, architecture diagram, status, footer
  components/ui/                shadcn primitives (button, textarea), re-tokenized
  lib/api/{client,types}.ts     typed client + wire types (source of truth for the contract)
  lib/site.ts                   facts printed on the page, read off the Worker source (not retyped)
```

`@/*` resolves to `./src/*` (tsconfig + Vite alias).

### Design system (locked)

This is a "Page Theme Lock" build — one light theme, deliberately. Editing must respect the locks or the page loses its point:

- **`dark:` variant is neutered.** `src/index.css` defines `@custom-variant dark (&:where(.dark, .dark *))` and `.dark` is never applied anywhere. Without this override, Tailwind v4 falls back to `prefers-color-scheme` and every `dark:*` utility baked into the shadcn primitives fires for OS-dark visitors — giving them dark inputs on a light page. Do not remove this variant; do not add a theme toggle.
- **Three type registers, one rule each:** `Newsreader` (serif) = authored prose (headlines, Ada's answers); `Geist` (sans) = interface (nav, buttons, labels, visitor messages); `Geist Mono` = machine record (instance path, tool names, JSON, iteration ordinals, timings). All self-hosted via Fontsource — no `<link>` to Google Fonts.
- **Ultramarine `#2440C8` is the only accent** and has exactly four jobs: links, the Send button, the active-iteration marker, focus rings.
- **Every radius is 2px.** `--radius: 2px` is aliased into every shadcn radius token (`--radius-sm` through `--radius-4xl`). Nothing is ever a pill.
- **Motion is three CSS transitions:** trace disclosure (`.disclosure` uses `grid-template-rows 0fr→1fr` — height-agnostic collapse without JS measurement), the in-flight `.ada-tick` indicator, and button press feedback. No animation library. Everything collapses under `prefers-reduced-motion`.

Colors and tokens are in `src/index.css` under `:root`. shadcn semantic tokens (`--background`, `--primary`, etc.) are mapped onto the design tokens so primitives inherit the design.

### Facts on the page

`src/lib/site.ts` (`SITE`, `STACK`) is the single source of truth for anything printed about the Worker (model name, `MAX_ITERATIONS`, agents SDK version). These are read off `ada-agent/src/index.ts` and its `wrangler.jsonc` so the page cannot silently drift from the Worker. Update `site.ts` when the Worker changes, not the copy in components.

## Known constraints

- The Worker returns a flat `trace` with no per-entry iteration index. Tool calls are numbered in call order and `iterations` is reported separately — the UI does not fake iteration grouping.
- No streaming. The Worker returns the whole turn at once. The transcript is built so this can change without restructuring.
- `SITE.githubUrl` in `src/lib/site.ts` is a placeholder — set it before sharing.
