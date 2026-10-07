# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — Vite dev server on http://localhost:5173. Proxies `/agents` to the Chak Worker.
- `npm run build` — `tsc -b && vite build`. Type-checks the whole project then emits to `dist/`.
- `npm run lint` — `oxlint` (config in `.oxlintrc.json`; enforces `react/rules-of-hooks` and `react/only-export-components`).
- `npm run preview` — serves the built `dist/` locally.

There is no test runner in this repo.

### Worker coupling

This app is only the front end for the Chak Worker (`ada-agent`, a separate repo — the repo and Worker keep their `ada` names; only the agent was renamed). Local dev requires the Worker running on the port set by `ADA_WORKER_ORIGIN` (default `http://localhost:8787`). `wrangler dev` silently picks the next free port when the default is taken — pass `--port 8787` explicitly, otherwise every request returns 502 through the Vite proxy.

### Environment variables

- `VITE_API_BASE_URL` (client, build-time) — prefix for the `/agents/chak/{instance}` call. Empty (default) routes through the Vite proxy for same-origin dev. Set to the Worker URL for production builds; inlined at build time, so changes require a rebuild.
- `ADA_WORKER_ORIGIN` (dev only, read by `vite.config.ts`) — proxy target. Never shipped to the client.

## Architecture

Single-page React 19 + Vite app. One route (`ChakPage`), no router. The page's whole purpose is to render the Chak agent's tool-call trace, so the wire contract and how traces flow through state matter more than the component tree.

### Wire contract (source of truth: `src/lib/api/types.ts`)

```
POST /agents/chak/{instance}    body: { question }
POST /agents/chak/{instance}    body: { decision: { id, action: 'approve' | 'cancel', args?: { title, description } } }
```

The `{instance}` path segment IS the Durable Object memory boundary in the Worker. It is deliberately surfaced in the console header rather than hidden — printing it teaches the architecture, and "New conversation" minting a new id demonstrates it in reverse. Ids are generated (no name prompt) and persisted in `localStorage` under `chak.conversations.v1`.

The `chak` slug is `AGENT.slug` in `src/lib/site.ts` and is not free to change: the agents SDK routes on the Durable Object binding name in `ada-agent/wrangler.jsonc`. The agent was renamed from Ada (Worker migration `v3`, `renamed_classes`, so existing conversations survived). The Worker still rewrites `/agents/ada/*` for one release, and `use-conversations.ts` still reads the old `ada.conversations.v1` / `ada.instance` keys once; both shims can go once no client needs them.

Four response shapes, all handled by `ask()` in `src/lib/api/client.ts`:

| Status | Body | Behavior |
| --- | --- | --- |
| 200 | `{ answer, iterations, trace[] }` | Turn resolved. A turn the input guard blocked is also a 200: `iterations: 0`, the guard row with `action: 'blocked'`, and a fixed refusal as `answer`. So is a turn whose answer leaked the system prompt: full trace, the verify row with `action: 'replaced'`, and a fixed reply as `answer` |
| 200 | `{ approval, iterations, trace[] }` | The turn **paused** on a ticket waiting for the visitor (human in the loop, below). The turn becomes `awaiting` and renders an approval card |
| 400 | `{ error }` | Inline error with retry. Also a malformed decision |
| 409 | `{ error }` | A decision for a ticket that is no longer waiting (already decided, or dropped by a newer message). The card closes and says so |
| 500 | `{ error, trace[] }` | Loop exceeded `MAX_ITERATIONS`; **partial trace is still rendered** |
| 502 | `{ error, trace[] }` | A model or sub-agent call threw mid-turn; partial trace rendered, without the "out of passes" copy (`Turn.errorStatus` tells the two apart) |

`trace[]` is a union (`TraceEntry` in `types.ts`, mirrored from `ada-agent/src/trace.ts`): `kind: 'tool'` rows are calls the router made; `kind: 'check'` rows are Jev (TypeSafe System One) checks, rendered as `jev.<check>`. There are three. `triage_ticket` runs inside the loop, just before each `create_ticket`, so its row sits directly above that call: it judges category (Choice), urgency (Score, 0–3), security incident (Noul), and which existing ticket covers the same problem and how (two Choices), and the Worker derives a P1–P4 priority in code and files it with the ticket. A failed triage files the ticket untriaged (`priority: null`). Triage also asks `specific_problem` and `stated_by_user`; if either is under 0.5 (`SITE.triageHold`, mirrored from `HOLD` in `src/jev/triage-ticket.ts`) the ticket is **held**: not filed, the row carries `action: 'held'`, and the model gets a `created: false` result telling it to ask what is wrong. That is the code-level backstop for "create me a ticket"; a line in the `create_ticket` description usually makes the model ask first. A skipped or failed triage never holds. `verify_answer` runs **after** the loop on every answered turn (not on a blocked turn, a 500, or a 502), so it is always the last row: it reads the answer against this turn's and earlier turns' tool results (`unconfirmed_action`, `contradicts_tool_result`, `unsupported_ticket_fact`) and against the system prompt (`prompt_leak`). Only `prompt_leak` is enforced: above 0.6 (`SITE.answerReplace`, mirrored from `REPLACE` in the Worker's `src/jev/verify-answer.ts`) the answer is swapped for fixed text, both in the response and in Durable Object history, and the row carries `action: 'replaced'`. The other three are recorded only. `input_guard` (injection / in-scope / pasted-credential probabilities) runs **before** the model. `in_scope` means workplace IT only: Chak is scoped to the IT helpdesk, and HR, policy, and general questions reach the model, which declines them in one line (system prompt). Phase 4's `domain` label was removed when the scope narrowed to IT; old turns in localStorage that carry it still render. It enforces two rules (`SITE.guardBlock`, mirrored from `BLOCK` in the Worker's `src/jev/input-guard.ts`): injection above 0.9 (a clear attack), or injection above 0.5 while in_scope is below 0.5 (suspicious and not IT work). Either refuses the turn without calling the model, and the row carries `action: 'blocked'`. A suspicious message that *is* IT work still reaches the model, so the system prompt's own injection defense still matters. `credential` is recorded only. `flagged` is a separate, display-only rule (> 0.5) set by the Worker. A skipped or failed check never blocks — a TypeSafe outage lets questions through. A tool row with no `kind` is a turn saved in localStorage before checks existed. `normalizeTrace()` drops unrecognized rows one at a time rather than rejecting the trace. **Deploy this front end before a Worker that adds a new row shape** — older front ends dropped the whole trace on any row without a `tool` field.

**Human in the loop.** `create_ticket` never runs on the model's word alone. When the model calls it and triage does not hold the ticket, the Worker's loop pauses: it saves where it stopped (`pending` in the Durable Object state, `ada-agent/src/approval.ts`) and returns `{ approval }` instead of an answer. The approval carries the proposed title and description plus triage's priority, category, security flag, and linked ticket, so the card can show them. The visitor's decision is the next request (`decide()` in `client.ts`): approve as written, approve with edits (the Worker triages the edited text again, without the hold rule, because the visitor wrote or approved it), or cancel (the model is told and writes the reply). The loop then resumes, and the response carries the whole turn's trace, from both sides of the pause, with a `kind: 'approval'` row (rendered `human.approval`, its `ms` is how long the ticket waited) between the triage row and the `create_ticket` row. A new message instead of a decision drops the ticket: the Worker keeps that turn in history with a "not filed" result, so "yes, file it" still has context, and the front end closes the card as `dropped`. Approval ids are random, so a stale card can only ever get a 409. The guard does not run on edited text; the edits reach the model only inside a `<tool_result>`, and the answer check still runs.

Gateway failures (502/503/504 with no JSON body — typical for a dead Worker upstream) are re-messaged as "Chak is offline: the Worker is not responding" rather than surfaced as raw status codes. All non-2xx and transport failures throw `ChakError`, which carries the partial trace so the UI can still show the work.

### State flow

- `useSession()` (`src/features/chat/use-session.ts`) — owns the instance id, persists to `localStorage`, exposes `resetSession()`.
- `useAsk(instance)` (`src/features/chat/use-ask.ts`) — owns the ordered, append-only transcript in local state. Wraps `ask()` and `decide()` in one TanStack Query mutation. **The pending row and the answered row are the same `Turn` object** — the row is appended as `pending` on submit, then patched in place on success/failure. A turn that pauses becomes `awaiting`, and the decision patches that same row (its `elapsedMs` adds both roundtrips, not the time spent deciding). A decision that fails before reaching the loop (409, rate limit, offline) leaves the card open with the reason; one that fails inside the resumed loop fails the turn with its trace. This is deliberate: the transcript never jumps, and streaming can be added later without restructuring.
- `App.tsx` — TanStack Query is configured with `retry: false` for mutations. Failed agent turns must surface to the visitor immediately with a retry they choose, not be silently repeated.

Client-side elapsed time is measured with `performance.now()` and attached to `ChakError` on failure so failed turns still report honestly.

### Layout

```
src/
  routes/chak-page.tsx          the single page
  features/chat/                console, transcript, trace, composer, session + ask hooks
  components/                   masthead, capabilities, builder's note, architecture diagram, status, footer, chak-sprite
  components/ui/                shadcn primitives (button, textarea), re-tokenized
  lib/api/{client,types}.ts     typed client + wire types (source of truth for the contract)
  lib/site.ts                   facts printed on the page, read off the Worker source (not retyped)
```

`@/*` resolves to `./src/*` (tsconfig + Vite alias).

At `lg`+ the hero sprite is a button (`EnlargeChatButton`, with a "click me to enlarge" callout) that toggles the console between the hero's 7fr column and the full row. Enlarged, the hero copy steps aside (the `h1` stays as `lg:sr-only` for the `aria-labelledby`) and the sprite drops to 64px. Below `lg` the console is already full width, so the plain sprite renders instead and every class the toggle switches is `lg:`. No animation: the switch is instant, so the motion budget stays at three. Answer and question prose are capped at `68ch` so they stay readable in the enlarged console.

### Design system (locked)

This is a "Page Theme Lock" build — one light theme, deliberately. Editing must respect the locks or the page loses its point:

- **`dark:` variant is neutered.** `src/index.css` defines `@custom-variant dark (&:where(.dark, .dark *))` and `.dark` is never applied anywhere. Without this override, Tailwind v4 falls back to `prefers-color-scheme` and every `dark:*` utility baked into the shadcn primitives fires for OS-dark visitors — giving them dark inputs on a light page. Do not remove this variant; do not add a theme toggle.
- **Three type registers, one rule each:** `Geist Pixel` (`font-pixel`) = authored prose (headlines, Chak's answers, and the small lowercase section kickers outside the console's trace); `Geist` (sans) = interface (nav, buttons, labels, visitor messages); `Geist Mono` = machine record (instance path, tool names, JSON, iteration ordinals, timings). All self-hosted via Fontsource — no `<link>` to Google Fonts. Geist Pixel ships a single 400 weight, so don't pair it with `font-medium` (it silently does nothing); emphasis inside answers uses `font-semibold` to get a synthesized bold.
- **Marmalade `#A84A0C` is the only accent** (5.3:1 on paper) and has exactly four jobs: links, the Send button, the active-iteration marker, focus rings. The approval card's "File ticket" is not one of them: it is an outline button with an ink border. `--danger` is crimson `#A3123A`, deliberately far from the accent's hue so an error never reads as a link.
- **Every radius is 2px.** `--radius: 2px` is aliased into every shadcn radius token (`--radius-sm` through `--radius-4xl`). Nothing is ever a pill.
- **Motion is three CSS transitions:** trace disclosure (`.disclosure` uses `grid-template-rows 0fr→1fr` — height-agnostic collapse without JS measurement), the in-flight `.chak-think` sprite loop (the page's only `@keyframes`; reduced motion shows the static idle frame), and button press feedback. No animation library. Everything collapses under `prefers-reduced-motion`.

Colors and tokens are in `src/index.css` under `:root`. shadcn semantic tokens (`--background`, `--primary`, etc.) are mapped onto the design tokens so primitives inherit the design.

### Mobile (design: `docs/design/mobile.md`)

- **Below `lg` the page scrolls, never a panel.** The console is a fixed-height panel with its own scrolling thread only at `lg`+. Below that, the composer is `sticky bottom-0` (with a safe-area bottom pad) and `ChakConsole` scrolls the *page* to the newest turn, never on first load and only when the visitor is already watching it. Don't add nested scroll containers on phones.
- **Touch-only fixes use `pointer-coarse:`**, so desktop stays unchanged: 44px hit areas (padding plus negative margin where the visual size must not change), the always-visible History delete, the hidden "Shift + Enter" hint, and the composer letting go of `sticky` while focused (iOS keyboard fallback).
- **Inputs are 16px below `sm`**, or iOS Safari zooms the page on focus. The textarea has `enterKeyHint="send"`.
- **Machine-register text floor is 11px.** Don't reintroduce 10.5px.
- **Nothing may widen the page.** The hero grid is `grid-cols-1` (`minmax(0,1fr)`) below `lg`, so content that can't shrink overflows its own box instead of the viewport, and the console header's "memory scope" path wraps under its label rather than truncating. Both were found when the page measured 8px too wide at 320px. Re-check horizontal overflow at 320 after adding any `whitespace-nowrap` text.
- Phone navigation shows Capabilities + Source; Architecture and Status join at `sm`.

### Chak, the character (design: `docs/design/chak-brand.md`)

Chak is an orange-and-white office cat. Pronoun: **he**. The character is a tone, and it must stay professional:

- **Character lives in the chrome, never in the record.** Trace rows, JSON, tool names, paths, and timings stay literal; the trace header still says `router loop`.
- **No cat-speak anywhere** — not in UI copy, not in answers (the Worker's system prompt forbids cat sounds, puns, and roleplay). Error copy states the real cause; the Worker's own error text is shown verbatim, never rewritten.
- **Sprite rules** (`src/components/chak-sprite.tsx`, frames in `chak-sprite-frames.ts`): 16×16 grid, rendered only at multiples of 16px (the `size` prop is a literal union for this reason), always `aria-hidden` because his name is always printed beside him. The fur colours are illustration-only — bright fur is 2.7:1 and must never carry text or a control. `public/favicon.svg` is generated from the idle frame; regenerate it if the frames change.

### Facts on the page

`src/lib/site.ts` (`AGENT`, `SITE`, `CAPABILITIES`, `GUARDRAILS`, `CANNOT`, `STACK`) is the single source of truth for anything printed about the Worker (name and route slug, model, `MAX_ITERATIONS`, agents SDK version, the pinned Jev model, what Chak can and cannot do). `CAPABILITIES` lists live behavior only; planned work belongs in the status ledger. These are read off `ada-agent/src/index.ts` and its `wrangler.jsonc` so the page cannot silently drift from the Worker. Update `site.ts` when the Worker changes, not the copy in components.

## Known constraints

- The Worker returns a flat `trace` with no per-entry iteration index. Rows (tool calls and checks) share one ordinal sequence in start order, the header counts them separately, and `iterations` is reported on its own — the UI does not fake iteration grouping, and a check never counts as an iteration.
- The block rules were chosen from the 18-case live eval (`npm run eval` in ada-agent), not from production traffic: direct attacks scored 0.94–0.99; suspicious off-topic messages 0.79–0.84 injection with in_scope ≤ 0.36; every harmless message, including short follow-ups like "yes, file it" and "thanks!", ≤ 0.08 injection. The guard sees only the current message, so if a real follow-up ever scores suspicious, the second rule would cut a conversation off — watch for that. Revisit against real `jev.check` / `guard.blocked` logs (`guard.blocked` records which `rule` fired; `docs/jev-requirements.md` §6). The guard adds its latency (~260–375 ms) to every turn, because the model now waits for it, and the answer check adds about the same again to every answered turn, because it needs the answer. Triage adds about the same again to each ticket filed. The Worker serves only `/agents/chak/*` (and the legacy `/agents/ada/*`); sub-agents such as `ItAgent` are reachable only through the router's Durable Object binding. Requirements are in `docs/jev-requirements.md` (Phase 4, the front-door router, is retired: Chak is IT only); answer verification is `docs/jev-design-phase-2.md`, ticket triage `docs/jev-design-phase-3.md`.
- Llama 4 Scout sometimes writes a tool call into its reply as text (`[create_ticket(title="…", description="…")]`) instead of making it, typically at the second step of a chained request. The Worker parses that text (`ada-agent/src/text-tool-call.ts`, keyword or JSON form only) and runs it through the normal path, triage and hold included; the trace row carries `fromText: true` and renders "parsed from text". Asking the model again did not work (4 of 4 wrote it as text again), and Workers AI has no `tool_choice` for this model.
- No streaming. The Worker returns the whole turn at once. The transcript is built so this can change without restructuring.
- `SITE.githubUrl` in `src/lib/site.ts` is a placeholder — set it before sharing.

## Claude Code skills and agent

- `.claude/skills/worker-sync`: bring the page in line with a Worker change. `references/worker-map.md` lists every Worker symbol this repo mirrors and where; add a row whenever `src` copies a new value or shape from the Worker.
- `.claude/skills/chat-console`: the turn lifecycle, trace rows, approval card, and saved conversations, with recipes for new row kinds, checks, and statuses.
- `.claude/skills/chak-design`: the design locks above as a build guide and a review checklist with greps.
- `.claude/agents/chak-fe-agent.md`: the agent an ada-agent session hands front-end work to. An identical copy lives in `~/.claude/agents/` so sessions in other repos can see it. Edit both, or they drift.
