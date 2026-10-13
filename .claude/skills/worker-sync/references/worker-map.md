# Worker → front-end map

Every Worker symbol this repo depends on, and where it's mirrored. Worker paths are relative to `~/Documents/Github/ada-agent`, front-end paths to `~/Documents/Github/ada-agent-fe`. Line numbers drift, so search for the symbol.

## Wire contract

| Worker | Mirrored in | Notes |
| --- | --- | --- |
| Bodies returned by `Chak.onRequest` (`src/index.ts`) | `AskResponse`, `AskErrorBody`, and the header comment in `src/lib/api/types.ts`; `post()` in `src/lib/api/client.ts`; the wire contract table in `CLAUDE.md` | `post()` checks for `approval` before `answer`. Anything else on a 200 throws |
| Status codes: 200, 400, 409, 500, 502 | `post()`, `onError` in `src/features/chat/use-ask.ts`, the `overran` check in `src/features/chat/turn.tsx` | Only a 500 with a trace gets the "stopped after N passes" line. A 502 with a trace is a model call that threw (after one retry for a dropped connection). An ItAgent failure is a 200 with an error result on its tool row (`unreachableResult` in `src/failures.ts`) |
| 429 from the rate limiter (`fetch` in `src/index.ts`) | Nothing specific: shown as the Worker's text | On a decision, it leaves the card open with `approvalError` |
| Gateway 502/503/504 with no JSON body | The `gatewayDown` copy in `post()` | Not sent by the Worker: this is the Vite proxy or Cloudflare when the Worker is down |
| 409 `That ticket is no longer waiting for approval.` | `approvalClosed: 'stale'` in `use-ask.ts`, its copy in `approval-card.tsx` | |
| A new message drops the waiting ticket (`DROPPED_RESULT`, `historyAfterDrop` in `src/approval.ts`) | `submit()` sets `approvalClosed: 'dropped'` in `use-ask.ts` | The front end closes the card without waiting for the Worker |
| `TraceEntry` (`src/trace.ts`) | `TraceEntry` in `types.ts`; `isTraceEntry()` in `client.ts`; `ToolRow`, `CheckRow`, `ApprovalRow` in `src/features/chat/trace.tsx` | Required fields go in `isTraceEntry()`. Anything the row can render without stays optional |
| `ToolCallEntry` (`kind: 'tool'`, `fromText`) | `ToolCallEntry`, `isToolCall()`, `ToolRow` | `kind` is optional here for pre-checks turns. `fromText` renders as "parsed from text" |
| `CheckEntry` | `CheckEntry`, `CheckRow` | |
| `CheckName` (`input_guard`, `triage_ticket`, `verify_answer`) | `CheckEntry.check: string`, rendered `jev.<check>` | A new name renders with no change |
| `CheckReason` | `CheckEntry.reason: string`, shown on skipped and error rows | A new reason renders with no change |
| `CheckEntry.action` (`blocked`, `replaced`, `held`) | `CheckEntry.action: string`; the `blocked`, `held`, and `replaced` labels in the `Trace` header | A new action shows on its row automatically. Add a header label when visitors should notice it |
| `CheckAnswer` (`noul`, `choice`, `score`, `flagged`) | `CheckAnswer` in `types.ts`, `AnswerLine` in `trace.tsx` | A new answer type passes `isTraceEntry()` (it checks only `id` and `type`) but needs a `CheckAnswer` member to render its fields |
| `ApprovalEntry` | `ApprovalEntry`, `isApproval()`, `ApprovalRow` | `decision` is a string here |
| `approvalView()` in `src/approval.ts` (the `approval` body) | `PendingApproval`, `isPendingApproval()`, `TriageLine` in `src/features/chat/approval-card.tsx` | `priority: null` means triage didn't run. The card prints "untriaged" |
| `Decision` and `parseDecision()` in `src/approval.ts` | `ApprovalDecision` in `types.ts`, `decide()` in `client.ts` | |
| `notice` on the approval and answer bodies (`SECRET_NOTICE`, `sharedSecret()` in `src/secret-notice.ts`; set in `approvalView()` and `Chak.onRequest`) | `PendingApproval.notice`, the `notice` on `AskResponse`, `Turn.notice`, `post()` in `client.ts`, `onSuccess` in `use-ask.ts`, `Notice` in `src/features/chat/notice.tsx` | Optional and rendered verbatim. Kept on the turn after a decision. Non-string values are dropped in `post()` |
| `TICKET_LIMITS` in `src/approval.ts` | `TITLE_MAX` and `DESCRIPTION_MAX` in `approval-card.tsx` | Literal copies |

## Facts printed on the page

No test compares these with the Worker. The Worker's `test/skills.spec.ts` checks the Worker's own skills, not this repo, so compare each value by hand.

| Worker | Mirrored in | Printed by |
| --- | --- | --- |
| `MODEL` in `src/index.ts` | `SITE.model`; `SITE.previousModel` is the commented-out fallback above it | `site-footer.tsx`, `architecture.tsx` |
| `MAX_ITERATIONS` in `src/index.ts` | `SITE.maxIterations`; literal copies in the `types.ts` header comment ("(5)") and `status-ledger.tsx` ("five-pass") | `turn.tsx`, `architecture.tsx`, `builders-note.tsx`, `CAPABILITIES`, `GUARDRAILS` |
| `agents` in `package.json` | `SITE.agentsSdkVersion` | `STACK` in the footer. Print the installed version: `node -p "require('$HOME/Documents/Github/ada-agent/node_modules/agents/package.json').version"` |
| `JEV_MODEL` in `src/jev/run-check.ts` | `SITE.jevModel` | `CAPABILITIES`, `architecture.tsx` |
| `BLOCK` in `src/jev/input-guard.ts` | `SITE.guardBlock` | `CAPABILITIES`, `GUARDRAILS`, `architecture.tsx` |
| `REPLACE` in `src/jev/verify-answer.ts` | `SITE.answerReplace` | `CAPABILITIES`, `GUARDRAILS`, `architecture.tsx` |
| `HOLD` in `src/jev/triage-ticket.ts` | `SITE.triageHold` | `GUARDRAILS` |
| `RATE_LIMITER` `simple` in `wrangler.jsonc` (also as a literal in `GUARDRAILS`) | `SITE.rateLimit` | the API part in `architecture.tsx` |
| `MAX_HISTORY_ENTRIES` in `src/index.ts` | `SITE.historyEntries` | the State part in `architecture.tsx` |
| `EMBEDDING_MODEL`, `KB_DIMENSIONS`, `KB_RESULT_LIMITS.articles` in `src/kb.ts`; the `chak-kb` index in `wrangler.jsonc`; the files in `kb/articles/` | `SITE.kb` (`live` flips to `true` when the Worker with `search_kb` deploys) | the Data, Models, and Workflow parts in `architecture.tsx` |
| `MAX_TRIAGE_CANDIDATES` in `src/index.ts` | `SITE.triageCandidates` | `CAPABILITIES` |
| `derivePriority()` and `SECURITY_INCIDENT_ABOVE` in `src/jev/triage-ticket.ts` | The literal "a priority from P1 to P4, and a security incident is always P1" in the "Triages every ticket" entry of `CAPABILITIES` | Capabilities section. A change to the priority policy makes this sentence wrong, with nothing to flag it |
| `MAX_QUESTION_LENGTH` in `src/index.ts` | Literal `'2,000 characters per question'` in `GUARDRAILS` | Capabilities section |
| `RATE_LIMITER` `simple.limit` / `period` in `wrangler.jsonc` | Literal `'10 requests per minute per IP'` in `GUARDRAILS`, and the last "shipped" item in `status-ledger.tsx` | Both literal |
| `TOOLS` and `TOOL_ROUTING` in `src/index.ts` | the Workflow part's `tools` fact in `PARTS` (`architecture.tsx`, `search_kb` gated by `SITE.kb.live`); the tool-backed `CAPABILITIES`; "He has four tools" in `CAPABILITIES`; `SUGGESTED_PROMPTS` in `src/features/chat/suggested-prompts.ts` | `list_tickets` is router-only and never listed. Each `exercises` label must match what the latest eval measured |
| Owner-only `lookup_ticket` (`filedByCaller()` and the lookup handler in `ItAgent`, `src/index.ts`): own tickets plus fixtures 42/77, anything else reads as not found | "Looks up an IT ticket", "Lists your tickets", and "Keeps each conversation's tickets to itself" in `CAPABILITIES`; the Ticket store step of the State part in `architecture.tsx`; "ticket data" in `builders-note.tsx`; "shipped" and the "No auth" limit in `status-ledger.tsx` | Since 2026-10-12. Triage's candidate ids still span every conversation (user decision), which the capability says |
| Optional `usage: { passes, inputTokens, outputTokens }` on bodies that carry a trace (`respond`, `src/index.ts`) | Not mirrored: `client.ts` ignores unknown keys | Add it to `AskResponse` only if the page ever shows it |
| Durable Object binding `Chak` in `wrangler.jsonc` | `AGENT.slug` in `site.ts`, used by `instancePath()` | Not free to change: every saved conversation routes on it. Report a rename instead of making it |
| Fixture tickets 42 and 77 (`ItAgent`) | `CANNOT`; "known limits" in `status-ledger.tsx`; `CAPABILITIES` and `SUGGESTED_PROMPTS` examples | |
| What the system prompt allows and refuses (`src/system-prompt.ts`) | `CAPABILITIES`, `CANNOT`, the "shipped" list in `status-ledger.tsx` | `CAPABILITIES` lists live behavior only. Planned work goes under "next" in the ledger |
| Turn order: guard → loop → (search) → triage → approval → call → verify (`Chak.onRequest`) | the Workflow part's `steps` in `PARTS` (`architecture.tsx`), the doc comments on `TraceEntry` and `Trace`, the trace paragraph in `CLAUDE.md` | |

## Eval results

| Worker | Mirrored in | Notes |
| --- | --- | --- |
| `PageData` in `evals/page.ts`, written by `npm run eval:export` from the runs in `evals/page.config.ts` | `src/data/evals.json` (generated), the `EvalData` types in `src/lib/evals.ts`, `EvalResults` in `src/components/eval-results.tsx` | Regenerate after each eval run that should appear. A changed `PageData` shape needs the types updated. `FEATURED_COPY` must still describe the exported traces |

## Compatibility shims

| Worker | Front end | Remove when |
| --- | --- | --- |
| `/agents/ada/*` rewritten to `/agents/chak/*` | Nothing (the page calls `/agents/chak/` only) | Worker-side decision |
| v3 `renamed_classes` migration kept the old Durable Objects | `RENAMED_STORAGE_KEY` (`ada.conversations.v1`) and `LEGACY_INSTANCE_KEY` (`ada.instance`) in `src/features/chat/use-conversations.ts` | No returning visitor still has the old keys |

## Not mirrored (no front-end change)

- The system prompt's wording, unless it changes what Chak can or cannot do (then see the facts table).
- Jev question wording, `flag` rules, and calibration. The page shows whatever answers come back.
- `HELD_RESULT`, `CANCELLED_RESULT`, and other tool results the model reads. They show up in the trace as raw data.
- History format and `envelope()`. The Durable Object's history is never sent to the page.
- `ItAgent` storage and fixtures, except the ticket ids printed on the page.
- Evals and tests in `test/`.
- The Worker's `README.md` and `.claude/skills/**`. Those skills mirror some of the same constants for the Worker's own sessions, and `test/skills.spec.ts` checks them. That's a separate mirror set: changes there are never front-end work.
