---
name: worker-sync
description: Bring this front end in line with a change in the Chak Worker (ada-agent). Maps every Worker symbol the page mirrors (response bodies and status codes, trace rows, check actions, the approval and decision shapes, thresholds, limits, model ids, tools, shipped behavior) to the file that mirrors it, updates them in a fixed order, verifies, and decides the deploy order. Use when ada-agent changed or is about to, when a Worker response renders wrong or not at all, when the chak-fe-agent is handed a Worker change, or when auditing site.ts for drift.
argument-hint: "[what changed in ada-agent: files, symbols, old → new, or a commit range]"
---

# Worker sync

The page renders whatever the Chak Worker sends and prints facts read off the Worker's source. Both drift without an error: `normalizeTrace()` drops a row it doesn't recognize, and a changed threshold keeps printing its old value. This skill finds every mirror a Worker change touches and updates them together.

The change: $ARGUMENTS

## 1. Read the change in the Worker

The Worker is `~/Documents/Github/ada-agent`. Read it as much as you need, and never edit it.

```bash
git -C ~/Documents/Github/ada-agent status --short
git -C ~/Documents/Github/ada-agent diff HEAD -- src wrangler.jsonc package.json
git -C ~/Documents/Github/ada-agent log --oneline -10
```

`git diff` doesn't show untracked files, so read any `??` path under `src/` in full: a new check or module may not be added yet. Keep the diff limited to `src`, `wrangler.jsonc`, and `package.json`. The Worker's docs, skills, and tests never reach the page.

Read the diff even when you were given a summary. The summary says what the author meant; the diff says what the page will receive. If they disagree, follow the diff and say so in the report.

## 2. Classify it

Look up each changed symbol in [references/worker-map.md](references/worker-map.md), which names the file here that mirrors it. A symbol that isn't in the map is internal to the Worker (prompt wording, Jev question wording, history format, sub-agent storage). It needs no change here, but list it as checked.

If the diff touches only comments next to a mapped symbol (`git diff HEAD --word-diff` makes that easy to see), confirm the value still equals its mirror, list it as checked, and change nothing.

| Kind of change | What breaks if it's missed | Where it lands |
| --- | --- | --- |
| New trace row kind, or a new required field on a row | `normalizeTrace()` drops the row | `types.ts`, `isTraceEntry()` in `client.ts`, `trace.tsx` |
| New `action` on a check (today: `blocked`, `replaced`, `held`) | The row shows it, but the trace header says nothing | `Trace` header in `trace.tsx`, the `CheckEntry.action` comment, CLAUDE.md |
| New check name, reason, or decision value | Nothing: they are strings and render verbatim | Comments in `types.ts`, CLAUDE.md |
| New response body or status code | Thrown as "body without an `answer` field", or shown with the wrong copy | `post()` in `client.ts`, `AskResponse`, `use-ask.ts`, `turn.tsx` |
| Approval or decision shape | The card is empty, or every decision gets a 400 | `PendingApproval`, `ApprovalDecision`, `approval-card.tsx` |
| Threshold, limit, model, or version | The page prints a stale fact | `SITE` and `GUARDRAILS` in `site.ts`, the limits in `approval-card.tsx` |
| Tool added, removed, or renamed | The page lists the wrong tools | `IT_AGENT.tools` in `architecture.tsx`, `CAPABILITIES`, `CANNOT` |
| Behavior shipped, changed, or removed | The page promises something Chak doesn't do | `CAPABILITIES`, `status-ledger.tsx`, `LOOP_STEPS` in `architecture.tsx` |
| Route slug or Durable Object binding | Every request 404s | `AGENT.slug`. Stop and report it (see the map) |

## 3. Update in this order

Change the types first, so the compiler finds every consumer for you.

1. **`src/lib/api/types.ts`**: mirror `ada-agent/src/trace.ts` and the bodies `Chak.onRequest` returns. Keep the status table in the header comment current.
2. **`src/lib/api/client.ts`**: `isTraceEntry()`, `isPendingApproval()`, and `post()`.
3. **`src/features/chat/use-ask.ts`**: how a response patches the `Turn`. Use the `chat-console` skill for this step and the next.
4. **Components**: `trace.tsx`, `turn.tsx`, `approval-card.tsx`. Use the `chak-design` skill for anything visible.
5. **`src/lib/site.ts`**: every fact the change touches. Sentences that interpolate `SITE` update themselves; literal ones (`'2,000 characters per question'`) don't.
6. **`CLAUDE.md`**: the wire contract table, the trace paragraph, and Known constraints, in the words the code now uses. Update [references/worker-map.md](references/worker-map.md) too if a mirror was added or moved.

## Rules the mirror keeps

- **Tolerant, not strict.** `check`, `reason`, `action`, and `decision` are `string` here even though the Worker types them as unions, so a new value renders without a front-end release. Don't narrow them.
- **Drop rows one at a time.** `normalizeTrace()` filters and never rejects a whole trace. A new row kind needs its own branch in `isTraceEntry()`, or every row of that kind is dropped.
- **Saved turns still render.** Turns persist in `localStorage` (`chak.conversations.v1`) in the shape they had when they were saved. A new field is optional on `Turn` and on the trace types, and a field the Worker stops sending still renders when it's present. Phase 4's `domain` label is the precedent. A tool row with no `kind` is a tool call saved before checks existed.
- **Show the Worker's error text verbatim.** If visitors need a plain-English line, add it above the Worker's text, the way `turn.tsx` does for the 500. Never rewrite the Worker's text.
- **Don't invent structure.** If the Worker doesn't send something (a per-row iteration index, streaming), the page doesn't fake it.
- **Read facts; don't remember them.** Copy each value from the Worker file named in the map, and name that file in the `site.ts` comment.

## Deploy order

Decide the order and put it in the report.

| The Worker change | Order |
| --- | --- |
| Adds a row kind, a field, a response body, or a status code | **Front end first.** An older front end drops what it doesn't recognize. Until the Worker deploys, the old Worker is still live, so the front end must keep accepting the old shape too |
| Removes something | **Worker first.** Remove the handling here in a later release, once no saved turn needs it |
| Changes a fact only (threshold, model, limit) | Either order, close together. The page is stale in between |
| Renames the slug or the route | Coordinated. The Worker rewrites the old prefix for one release (precedent: `/agents/ada/*`) |

## Verify

```bash
cd ~/Documents/Github/ada-agent-fe && npm run build && npm run lint
```

Both must exit 0. A warning that was already there (today: `only-export-components` on `buttonVariants` in the shadcn `button.tsx`) is out of scope, so don't "fix" a primitive to silence it.

There is no test runner, and nothing checks `site.ts` against the Worker automatically. When the change alters what the Worker returns, also check the real response:

1. Is a Worker running? `curl -s --max-time 3 -o /dev/null -w '%{http_code}\n' localhost:8787/` prints `404` when one is up (the Worker serves only `/agents/chak/*`). `000` with a non-zero exit means no Worker is running, not that the tool failed.
2. Send the request that produces the new shape, with a fresh instance id, and compare the body with the types:
   ```bash
   curl -s -X POST "localhost:8787/agents/chak/sync-$(date +%s)" \
     -H 'content-type: application/json' -d '{"question":"Look up ticket 42"}'
   ```
   The `example` prompts in `CAPABILITIES` cover each path: a guard block, a hold, an approval, and a chained turn.
3. Send only the requests that prove the change. The Worker allows 10 requests per minute per IP, and each one costs model and Jev calls.

Don't start `wrangler dev` or `npm run dev` unless you're asked to: neither exits. If no Worker is running, report that the live check was skipped. When one is started, it needs `--port 8787`, or wrangler silently picks another port and the Vite proxy returns 502.

## Report

```
## Worker sync report
Worker change: <one-line summary>
- <ada-agent file:line>: <what changed there>
Front-end changes:
- <file:line>: <what changed>
Facts updated: <SITE.key old → new, from ada-agent/<file>:<line>> | none
Docs updated: <CLAUDE.md sections, worker-map rows> | none
Checked, no change needed: <changed Worker symbols with no mirror here>
New files: <paths> | none
Uncommitted before you started: <paths in ada-agent-fe that git status already showed> | none
Verification: build <pass|fail>, lint <pass|fail>, live <request → result | skipped: no Worker on :8787>
Deploy order: <front end first | Worker first | either>, because <reason>
Needs a decision: <what, and the Worker file:line> | none
```

Paste the failing output when build or lint fails.

## Keeping this skill in sync

[references/worker-map.md](references/worker-map.md) has to list every value or shape this repo copies from the Worker. When you add a copy anywhere in `src`, add its row in the same change.

The Worker's code and docs point back here (`ada-agent/src/trace.ts` names `src/lib/api/types.ts` as its mirror, and several of its skills name `site.ts`). Before changing how this repo mirrors something, find every Worker reference that would go stale, and list them in the report for the caller:

```bash
grep -rn 'ada-agent-fe' ~/Documents/Github/ada-agent --include='*.ts' --include='*.md' --exclude-dir=node_modules
```
