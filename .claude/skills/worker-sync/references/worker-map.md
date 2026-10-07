# Worker → front-end map

Every Worker symbol this repo depends on, and where it's mirrored. Worker paths are relative to `~/Documents/Github/ada-agent`, front-end paths to `~/Documents/Github/ada-agent-fe`. Line numbers drift, so search for the symbol.

## Wire contract

| Worker | Mirrored in | Notes |
| --- | --- | --- |
| Bodies returned by `Chak.onRequest` (`src/index.ts`) | `AskResponse`, `AskErrorBody`, and the header comment in `src/lib/api/types.ts`; `post()` in `src/lib/api/client.ts`; the wire contract table in `CLAUDE.md` | `post()` checks for `approval` before `answer`. Anything else on a 200 throws |
| Status codes: 200, 400, 409, 500, 502 | `post()`, `onError` in `src/features/chat/use-ask.ts`, the `overran` check in `src/features/chat/turn.tsx` | Only a 500 with a trace gets the "stopped after N passes" line. A 502 with a trace is a call that threw |
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
| `MAX_TRIAGE_CANDIDATES` in `src/index.ts` | `SITE.triageCandidates` | `CAPABILITIES` |
| `derivePriority()` and `SECURITY_INCIDENT_ABOVE` in `src/jev/triage-ticket.ts` | The literal "a priority from P1 to P4, and a security incident is always P1" in the "Triages every ticket" entry of `CAPABILITIES` | Capabilities section. A change to the priority policy makes this sentence wrong, with nothing to flag it |
| `MAX_QUESTION_LENGTH` in `src/index.ts` | Literal `'2,000 characters per question'` in `GUARDRAILS` | Capabilities section |
| `RATE_LIMITER` `simple.limit` / `period` in `wrangler.jsonc` | Literal `'10 requests per minute per IP'` in `GUARDRAILS`, and the last "shipped" item in `status-ledger.tsx` | Both literal |
| `TOOLS` and `TOOL_ROUTING` in `src/index.ts` | `IT_AGENT.tools` in `architecture.tsx`; the tool-backed `CAPABILITIES`; "He has three tools" in `CAPABILITIES`; `SUGGESTED_PROMPTS` in `src/features/chat/suggested-prompts.ts` | `list_tickets` is router-only and never listed |
| Durable Object binding `Chak` in `wrangler.jsonc` | `AGENT.slug` in `site.ts`, used by `instancePath()` | Not free to change: every saved conversation routes on it. Report a rename instead of making it |
| Fixture tickets 42 and 77 (`ItAgent`) | `CANNOT`; "known limits" in `status-ledger.tsx`; `CAPABILITIES` and `SUGGESTED_PROMPTS` examples | |
| What the system prompt allows and refuses (`src/system-prompt.ts`) | `CAPABILITIES`, `CANNOT`, the "shipped" list in `status-ledger.tsx` | `CAPABILITIES` lists live behavior only. Planned work goes under "next" in the ledger |
| Turn order: guard → loop → triage → approval → call → verify (`Chak.onRequest`) | `LOOP_STEPS` in `architecture.tsx`, the doc comments on `TraceEntry` and `Trace`, the trace paragraph in `CLAUDE.md` | |

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
