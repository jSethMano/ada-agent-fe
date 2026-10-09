# Console recipes

## What each outcome does to the turn

| Outcome | Patch (`use-ask.ts`) | Renders (`turn.tsx`) |
| --- | --- | --- |
| Submit | Appends `{ status: 'pending' }`, and closes any open card as `approvalClosed: 'dropped'` | Thinking sprite and "routing" |
| 200 `{ answer }` | `status: 'answered'`, `answer`, `iterations`, `trace`, `elapsedMs`, `approval: undefined`, plus `notice` when sent (never cleared here) | Trace, then `Answer`, then `Notice` if the turn has one |
| 200 `{ approval }` | `status: 'awaiting'`, `approval`, `iterations`, `trace`, `elapsedMs`, `approvalClosed: undefined`, plus `notice` from `approval.notice` when sent | Trace with `approval="waiting"`, then `ApprovalCard` (keyed by `approval.id`), which shows `approval.notice` under its heading |
| Decision → 200 | Same as the matching row above, on the same turn, with `elapsedMs` added to the earlier roundtrip | |
| Decision → 409 | `approvalClosed: 'stale'` | Card's closed state: "no longer waiting" |
| Decision → any failure with no trace (429, offline, 400) | `approvalError: message`, status unchanged | Card stays open with the reason |
| Decision → failure with a trace (500, 502 from the resumed loop) | Same as a failed question | |
| Question → failure | `status: 'failed'`, `error`, `trace` (empty if none came back), `errorStatus`, `elapsedMs`, `approval: undefined` | Trace if it has rows (with `failed`), then the error box and "Retry this question" |
| Retry | Back to `pending`, clearing `error`, `errorStatus`, `trace`, `elapsedMs`, `notice` | |

## A new trace row kind

Example: the Worker adds `{ kind: 'handoff', to, reason, ms }`.

1. **`types.ts`**: add the interface and its member of the `TraceEntry` union, plus an `isHandoff()` guard next to `isCheck()`. Make every field the row can render without optional. Use `string` for anything that names a value the Worker may add to later. Update the union's doc comment with where the row sits in the turn.
2. **`client.ts`**: add a branch to `isTraceEntry()` for the new `kind`, checking only the fields the row can't render without. Without this branch, every row of this kind is dropped.
3. **`trace.tsx`**: add a `HandoffRow` built on `DisclosureRow` (`ordinal`, `ms`, `summary`, `panes`). The name is `font-mono text-[13px] font-medium text-ink`, prefixed by who acted unless it's a tool call. Previews are `text-[11.5px]`. The panes show the raw entry fields through `Payload`, unmodified.
4. **`Trace`**: add the kind to the dispatch in the `trace.map`. Decide whether the header counts it. `isToolCall()` already excludes it, because only `kind` `'tool'` or no `kind` counts as a tool call. Add a header label only if visitors should notice the row at a glance.
5. **`CLAUDE.md`**: the `trace[]` paragraph, and the wire contract table if the response changed.
6. **Deploy order**: the front end ships before the Worker starts sending the row (see the `worker-sync` skill).

## A new check

Nothing to build: `CheckRow` renders any `check` as `jev.<check>` with its answers, and a `skipped` or `error` row shows its `reason`.

Work is needed only when:

- **The Worker acts on it with a new `action`.** The row shows the action on its own. To surface it in the header, add `const x = trace.some((e) => isCheck(e) && e.action === 'x')` beside `blocked`, `held`, and `replaced`, and a label in danger ink with `whitespace-nowrap`. Document the value in the `CheckEntry.action` comment and in `CLAUDE.md`.
- **It has a new answer type.** Add the member to `CheckAnswer`, and make `AnswerLine` and `answerNote()` handle it.
- **It changes the turn** (like `input_guard` blocking with 0 iterations). Then the header logic and possibly `turn.tsx` need a case. Write down what the turn looks like: which rows, how many iterations, and whose answer is shown.

## A new turn status

1. Add it to `TurnStatus` in `types.ts`, with a doc comment.
2. Add the `AskResponse` variant and its branch in `post()`. It goes before the `answer` check, which throws on any 200 without `answer`.
3. Patch the turn in `onSuccess` in `use-ask.ts`.
4. Add a branch in `TurnView`. It's the only place that switches on `turn.status`: `grep -rn "status ===" src/features/chat` confirms.
5. Decide what a saved turn in this status shows after a reload, when no request is in flight. (A saved `pending` turn shows "routing" forever today, because nothing resets it on load. Don't copy that.)
6. Update the lifecycle diagram in `SKILL.md` and the State flow section in `CLAUDE.md`.

## A new approval field or outcome

- **A field on the card** (from `approvalView()` in the Worker): add it to `PendingApproval`, optional unless the card can't render without it. Add it to `isPendingApproval()` only if it's required. Render it in `TriageLine` if it's a triage fact, in mono `text-[11.5px]`, with danger ink only for a flag.
- **A new decision value** (beyond `approve` / `cancel`): `ApprovalDecision['action']`, the buttons in `ApprovalCard`, and `deciding` in `use-ask.ts`, which tells the card which button shows progress. The `ApprovalRow` header renders any `decision` string.
- **A new closed reason**: `Turn.approvalClosed`, and its sentence in the card's closed state.
- **Edited-ticket limits** come from `TICKET_LIMITS` in the Worker and are copied into `TITLE_MAX` and `DESCRIPTION_MAX` in `approval-card.tsx`.
