---
name: chat-console
description: Build or change the chat console in src/features/chat, covering the turn lifecycle (pending, awaiting, answered, failed), how a Worker response or failure patches a turn, the trace renderer and its row kinds, the approval card, retry, and saved conversations. Use when adding a trace row kind, a check label, a turn status, an approval outcome, a composer or history change, or when a turn renders wrong.
argument-hint: "[the console change to make, or the turn that renders wrong]"
---

# Chat console

The console exists to show the Chak agent's work: every tool call, check, and decision, in the order it happened, above the answer. Most changes here come from the Worker sending something new. The rest are about keeping the transcript honest and stable.

The change: $ARGUMENTS

## Where things live

| File | Owns |
| --- | --- |
| `src/lib/api/types.ts` | Wire types, `Turn`, `TurnStatus`, `ChakError`. The source of truth for the contract |
| `src/lib/api/client.ts` | `ask()`, `decide()`, response parsing (`post()`), row validation (`isTraceEntry()`) |
| `use-ask.ts` | The TanStack mutation, and every patch to a `Turn` |
| `use-conversations.ts` | Conversations in `localStorage`, instance ids, the legacy-key fallback |
| `console.tsx` | The panel: header with the memory scope, thread, scroll-to-newest |
| `turn.tsx` | One exchange: picks what to render for each `TurnStatus` |
| `trace.tsx` | The trace header and one row component per row kind |
| `approval-card.tsx` | The paused ticket: approve, edit, cancel, and the closed states |
| `answer.tsx` | The small inline Markdown renderer for Chak's answers |
| `composer.tsx`, `composer-draft.ts` | The input. Its draft is kept outside React state so a `CAPABILITIES` example further down the page can fill it |
| `conversation-menu.tsx` | History: switch, delete, start a new conversation |
| `suggested-prompts.ts` | The empty-state prompts, one per router path |

New files go flat in `src/features/chat/`, kebab-case, with named exports, like the files above. A component that something outside the console uses moves to `src/components/`. If the user asks for the per-feature subfolders of the global `frontend-structure` skill, do that move as its own change, never mixed into feature work.

## Turn lifecycle

```
submit ──► pending ──200 { answer }───────────────► answered
              │
              ├──200 { approval }──► awaiting ──decide()──► answered | awaiting (another ticket) | failed
              │                         ├── new message sent ─────────► approvalClosed: 'dropped'
              │                         ├── 409 ──────────────────────► approvalClosed: 'stale'
              │                         └── 429, offline, 400 (no trace)► approvalError, card stays open
              │
              └──4xx, 5xx, transport──► failed (keeps the trace when one came back) ──retry──► pending
```

[references/recipes.md](references/recipes.md) has the exact patch for each response, and step-by-step recipes for new row kinds, checks, statuses, and approval fields.

## Invariants

1. **One row per exchange.** A turn is appended as `pending` on submit and patched in place by id. The answer, the pause, the decision, and a retry all patch that same row. Never append a second row for any of them.
2. **A decision continues the turn.** `elapsedMs` is the first roundtrip plus the decision roundtrip. Time the visitor spent deciding doesn't count.
3. **Nothing retries on its own.** Mutations have `retry: false` (`App.tsx`). The visitor chooses to retry.
4. **Time is real.** `performance.now()` around each request. A failure carries its elapsed time on the `ChakError`.
5. **The trace sits above the answer**, because that's the order it happened in.
6. **One ordinal sequence, counted apart.** Tool calls, checks, and approvals are numbered together in start order. The header counts tool calls and checks separately. A check is never an iteration, and `iterations` is its own fact: the Worker sends no per-row iteration index, so don't group rows by pass.
7. **500 and 502 are different.** Both carry a trace. Only a 500 (out of passes) gets the "stopped after N passes" line. `errorStatus` tells them apart, and a saved turn without it that has a trace is treated as a 500.
8. **Saved turns render forever.** `Turn` is saved to `localStorage` as it is, capped at 20 conversations (the 5MB quota). A new field on `Turn` or a trace type is optional, and rendering never assumes it's there.
9. **The Worker's words are the record.** The Worker's error text renders verbatim, and payload panes show the raw wire data. Plain-English copy goes beside them, never in place of them.

## Copy in the console

- Trace header labels are short, lowercase, and `whitespace-nowrap`: "ticket held", "answer replaced", "waiting for your approval".
- Row names are mono and literal. A row the router didn't choose is prefixed with who acted: `jev.` for checks, `human.` for the visitor. It must never read as a tool call.
- Use `text-danger` only when the Worker acted (`blocked`, `held`, `replaced`), for a flagged answer, a security incident, or a failure. A skipped or failed check is muted, not danger: it never blocks.
- State the real cause. No cat-speak. See the `chak-design` skill for everything visible.

## Verify

```bash
cd ~/Documents/Github/ada-agent-fe && npm run build && npm run lint
```

Then look at it. Type-checking proves the code compiles, not that the turn renders:

- **Against a Worker:** `npm run dev`, with the Worker on port 8787. The suggested prompts and the `CAPABILITIES` examples cover lookup, approval, a hold, a guard block, and a chained turn.
- **Without one:** turns render from `localStorage`. Put a conversation holding the shape you need under `chak.conversations.v1` (`[{ instance, turns: [Turn], createdAt, updatedAt }]`) and reload. That's the quickest way to see a 500, a 502, a held ticket, or a saved turn from before a field existed.
- Check a phone width (320px) and an enlarged console (`lg`, after clicking the sprite) for any change to a row or the card.

## Keeping this skill in sync

The lifecycle and invariants restate `use-ask.ts`, `turn.tsx`, `trace.tsx`, and the State flow section of `CLAUDE.md`. When one of those changes, update this file and [references/recipes.md](references/recipes.md) in the same change.
