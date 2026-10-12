import { useState } from 'react'
import { ArrowUpRightIcon } from '@phosphor-icons/react'
import { EVALS } from '@/lib/evals'
import { AGENT, REPOS, SITE } from '@/lib/site'
import { cn } from '@/lib/utils'
import { Highlight } from '@/components/highlight'

/** Where a part lives. `fe` paths are in this repo, the rest in the Worker's. */
interface CodePath {
  path: string
  fe?: true
}

interface Part {
  id: string
  name: string
  /** One line under the tile, in the machine register. */
  gist: string
  summary: string
  /** What happens behind the part, in the order it happens. */
  steps: Array<{ label: string; detail: string }>
  facts?: Array<{ term: string; value: string }>
  code: CodePath[]
}

const kb = SITE.kb
const NOT_LIVE = 'Built and indexed; it goes live once its eval run is measured.'

const PARTS: readonly Part[] = [
  {
    id: 'api',
    name: 'API',
    gist: `POST /agents/${AGENT.slug}/{id}`,
    summary:
      'One public route. The page and the agent share an origin, so the browser never makes a cross-origin call.',
    steps: [
      {
        label: 'Browser',
        detail: `Sends { question } or { decision } to /agents/${AGENT.slug}/{id} on the page's own origin.`,
      },
      {
        label: 'Edge Worker',
        detail:
          'Serves the built page as static files and forwards only /agents/* to the agent Worker over a service binding: an internal call, so there is no CORS anywhere.',
      },
      {
        label: 'Agent Worker',
        detail: `Rate-limits by IP, ${SITE.rateLimit.requests} requests every ${SITE.rateLimit.seconds} seconds, then routes the request to the Durable Object named by {id}. Every other path returns 404, so the ticket store is never reachable from the internet.`,
      },
      { label: AGENT.name, detail: 'Runs the turn and answers with the whole trace.' },
    ],
    facts: [
      { term: 'route', value: `/agents/${AGENT.slug}/{id}` },
      { term: 'rate limit', value: `${SITE.rateLimit.requests} per ${SITE.rateLimit.seconds}s per IP` },
      { term: 'question', value: 'up to 2,000 characters' },
      { term: 'statuses', value: '200 · 400 · 409 · 429 · 500 · 502' },
    ],
    code: [{ path: 'worker/index.ts', fe: true }, { path: 'src/index.ts' }, { path: 'wrangler.jsonc' }],
  },
  {
    id: 'contracts',
    name: 'Contracts',
    gist: '{ question } → { answer | approval, trace }',
    summary:
      'Every response carries the trace, even a failed one. The Worker and this page share one typed contract, mirrored on both sides.',
    steps: [
      {
        label: 'Ask',
        detail:
          '{ question } returns { answer, iterations, trace }, or { approval, iterations, trace } when a ticket needs your decision.',
      },
      {
        label: 'Decide',
        detail:
          '{ decision: { id, action, args? } } approves, edits, or cancels the waiting ticket and resumes the turn. A decision for a ticket no longer waiting gets a 409.',
      },
      {
        label: 'Trace',
        detail:
          'One row per thing that ran, in order. tool: a call with its arguments and raw result. check: a Jev check with its scores and any action it took. approval: your decision and how long the ticket waited.',
      },
      {
        label: 'Failure',
        detail: `A turn that runs out of passes (500) or whose model call fails (502) still returns its partial trace.`,
      },
    ],
    facts: [
      { term: 'row kinds', value: 'tool · check · approval' },
      { term: 'check actions', value: 'blocked · held · replaced' },
    ],
    code: [{ path: 'src/trace.ts' }, { path: 'src/lib/api/types.ts', fe: true }],
  },
  {
    id: 'workflow',
    name: 'Workflow',
    gist: 'screen → loop → check',
    summary: 'One turn, in the order it runs. The model decides what to do; code and checks decide what it is allowed to do.',
    steps: [
      { label: 'Receive', detail: 'The id in the URL selects this conversation’s Durable Object, which already holds its history.' },
      {
        label: 'Screen',
        detail: 'Jev scores the question before the model sees it. A clear attack ends the turn here with a fixed refusal.',
      },
      {
        label: 'Decide',
        detail: `Scout reads the instructions, the history, and the tool list, then answers or calls tools, up to ${SITE.maxIterations} passes.`,
      },
      ...(kb.live
        ? [
            {
              label: 'Search',
              detail: `For a how-to or troubleshooting question he searches the help articles first and answers from the one that fits, naming it.`,
            },
          ]
        : []),
      {
        label: 'Act',
        detail:
          'Lookups go to the ticket store. A new ticket is triaged first, then the turn pauses and the ticket comes to you as a card.',
      },
      { label: 'Resume', detail: 'Your decision is the next request; the turn carries on where it stopped.' },
      {
        label: 'Check',
        detail: 'Jev reads the answer against what the tools returned. An answer that leaks his instructions is replaced.',
      },
      { label: 'Answer', detail: 'The reply goes back with the full trace of everything above.' },
    ],
    facts: [
      {
        term: 'tools',
        value: [...(kb.live ? ['search_kb'] : []), 'lookup_ticket', 'list_my_tickets', 'create_ticket'].join(' · '),
      },
      { term: 'max passes', value: String(SITE.maxIterations) },
    ],
    code: [{ path: 'src/index.ts' }, { path: 'src/approval.ts' }, { path: 'src/system-prompt.ts' }],
  },
  {
    id: 'safety',
    name: 'Safety',
    gist: 'code decides, not the model',
    summary: 'The rules that must never break live in code, so the model is never the last line of defense.',
    steps: [
      {
        label: 'Input guard',
        detail: `Refuses a question before the model runs: injection above ${SITE.guardBlock.injectionAbove}, or above ${SITE.guardBlock.suspiciousAbove} when it is not IT work.`,
      },
      {
        label: 'Triage hold',
        detail: `Holds a ticket for a problem you never described, or one whose text contains a pasted password or key, and has it written again.`,
      },
      { label: 'Your approval', detail: 'Nothing is filed until you approve, edit, or cancel it.' },
      {
        label: 'Answer check',
        detail: `Replaces an answer that leaks his instructions (prompt_leak above ${SITE.answerReplace.promptLeakAbove}) before you see it.`,
      },
      {
        label: 'Code guards',
        detail:
          'A lookup with no digit in the ticket id never reaches the store. Ticket text over the limits is rejected before the card. Your tickets are scoped to your conversation by the router, never by the model.',
      },
      { label: 'Fail open', detail: 'If a check is down, the turn carries on and the trace says the check was skipped.' },
    ],
    facts: [
      { term: 'held below', value: `specific_problem, stated_by_user ${SITE.triageHold.specificProblemBelow}` },
      { term: 'held above', value: `contains_secret ${SITE.triageHold.secretAbove}` },
    ],
    code: [
      { path: 'src/jev/input-guard.ts' },
      { path: 'src/jev/triage-ticket.ts' },
      { path: 'src/jev/verify-answer.ts' },
      { path: 'src/tool-guards.ts' },
    ],
  },
  {
    id: 'data',
    name: 'Data',
    gist: 'tickets · help articles',
    summary: 'Two stores, both demo data, both reachable only through the router.',
    steps: [
      {
        label: 'Tickets',
        detail:
          'Fixtures 42 and 77, and every ticket filed since, numbered from 78. Each keeps its triage and priority. list_my_tickets returns only the tickets this conversation filed.',
      },
      {
        label: 'Help articles',
        detail: `${kb.articles} demo articles, embedded with ${kb.embeddingModel.split('/').pop()} into the Vectorize index ${kb.index}; a search returns the top ${kb.topK} by cosine similarity.${kb.live ? '' : ` ${NOT_LIVE}`}`,
      },
      {
        label: 'Logs',
        detail: 'Structured events for blocks, holds, replaced answers, approvals, and failures. None of them record what you typed.',
      },
    ],
    code: [{ path: 'src/index.ts' }, { path: 'src/kb.ts' }, { path: 'kb/articles' }],
  },
  {
    id: 'state',
    name: 'State',
    gist: 'one Durable Object per conversation',
    summary: 'The id in the URL is the memory boundary. A new conversation is a new id, and a new memory.',
    steps: [
      {
        label: 'Conversation',
        detail: `One ${AGENT.name} Durable Object per id keeps the last ${SITE.historyEntries} messages and any ticket waiting for approval, so a decision still works after a reload.`,
      },
      { label: 'Ticket store', detail: 'One ItAgent Durable Object, shared by every conversation, keeps the filed tickets.' },
      { label: 'Browser', detail: 'Past conversations and their traces stay in this browser and can be resumed from History.' },
      { label: 'Edge', detail: 'The edge Worker keeps nothing.' },
    ],
    code: [{ path: 'src/history.ts' }, { path: 'src/approval.ts' }, { path: 'src/features/chat/use-conversations.ts', fe: true }],
  },
  {
    id: 'models',
    name: 'Models',
    gist: kb.live ? 'Scout · Jev · bge-m3' : 'Scout · Jev',
    summary: 'Each model has one job, and only one of them writes to you.',
    steps: [
      {
        label: 'Llama 4 Scout',
        detail:
          'The agent, on Workers AI: reads, decides, calls tools, and writes the reply. A call he writes as text is parsed and run, and marked in the trace. A dropped connection is retried once.',
      },
      {
        label: `Jev`,
        detail: `The checker, on TypeSafe, pinned to ${SITE.jevModel}: the input guard, triage, and the answer check. It returns typed scores, not prose.`,
      },
      {
        label: 'bge-m3',
        detail: `Turns articles and questions into ${kb.dimensions}-number vectors, so a search matches meaning rather than words.${kb.live ? '' : ` ${NOT_LIVE}`}`,
      },
    ],
    facts: [
      { term: 'agent', value: SITE.model },
      { term: 'checks', value: SITE.jevModel },
      { term: 'embeddings', value: kb.embeddingModel },
    ],
    code: [{ path: 'src/index.ts' }, { path: 'src/jev/run-check.ts' }, { path: 'src/kb.ts' }],
  },
  {
    id: 'quality',
    name: 'Quality',
    gist: `${EVALS.method.cases} cases · ${EVALS.method.liveReps} runs each`,
    summary: 'A change to how he behaves is measured against written cases before it ships.',
    steps: [
      { label: 'Unit tests', detail: 'The turn logic, the guards, and the grader, offline, on every change.' },
      {
        label: 'Agent eval',
        detail: `${EVALS.method.cases} written cases, ${EVALS.method.liveReps} runs each, graded from the trace by code and by a judge model. An unsure judgment is left ungraded, never passed.`,
      },
      {
        label: 'Iterations',
        detail: 'Each run is logged with what changed and what moved. A corrected answer key is applied to every earlier run, so runs compare like for like.',
      },
    ],
    code: [{ path: 'evals' }, { path: 'evals/ITERATIONS.md' }, { path: 'docs/observability.md' }],
  },
]

const PANEL_ID = 'architecture-panel'

function codeUrl({ path, fe }: CodePath): string | undefined {
  const repo = REPOS[fe ? 1 : 0]
  if (!repo?.url) return undefined
  return `${repo.url}/${path.includes('.') ? 'blob' : 'tree'}/main/${path}`
}

function PartPanel({ part }: { part: Part }) {
  return (
    <div className="grid gap-x-12 gap-y-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <div className="min-w-0">
        <h3 id={`${PANEL_ID}-heading`} className="text-[22px] font-medium tracking-tight text-ink">
          {part.name}
        </h3>
        <p className="mt-2 max-w-[62ch] text-[16px] leading-[1.6] text-ink-2">{part.summary}</p>
        <ol className="mt-6 space-y-4">
          {part.steps.map((step, index) => (
            <li key={step.label} className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-x-3">
              <span className="text-[12px] tabular-nums text-ink-3">
                {String(index + 1).padStart(2, '0')}
              </span>
              <div>
                <h4 className="text-[14px] font-medium text-ink">{step.label}</h4>
                <p className="mt-0.5 max-w-[68ch] text-[13.5px] leading-relaxed text-ink-2 [overflow-wrap:anywhere]">
                  {step.detail}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="min-w-0 space-y-6">
        {part.facts && (
          <dl className="space-y-1.5 border-t border-rule pt-3">
            {part.facts.map((fact) => (
              <div key={fact.term} className="grid gap-x-3 sm:grid-cols-[7.5rem_minmax(0,1fr)]">
                <dt className="text-[12px] text-ink-3">{fact.term}</dt>
                <dd className="text-[12.5px] text-ink-2 [overflow-wrap:anywhere]">{fact.value}</dd>
              </div>
            ))}
          </dl>
        )}
        <div className="border-t border-rule pt-3">
          <p className="text-[12px] font-medium tracking-wide text-ink-3">in the code</p>
          <ul className="mt-2 space-y-1">
            {part.code.map((code) => {
              const url = codeUrl(code)
              const label = `${code.fe ? 'ada-agent-fe' : 'ada-agent'}/${code.path}`
              return (
                <li key={label} className="text-[12.5px] [overflow-wrap:anywhere]">
                  {url ? (
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-accent-ink underline-offset-4 hover:underline pointer-coarse:-my-3 pointer-coarse:py-3"
                    >
                      {label}
                      <ArrowUpRightIcon aria-hidden weight="bold" className="size-3 shrink-0" />
                    </a>
                  ) : (
                    <span className="text-ink-2">{label}</span>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </div>
  )
}

export function Architecture() {
  const [openId, setOpenId] = useState<string | null>(null)
  // Kept after closing, so the panel still has content while it collapses.
  const [shownId, setShownId] = useState<string>(PARTS[0].id)
  const shown = PARTS.find((part) => part.id === shownId) ?? PARTS[0]
  const open = openId !== null

  const toggle = (id: string) => {
    setShownId(id)
    setOpenId((current) => (current === id ? null : id))
  }

  return (
    <section aria-labelledby="architecture-heading" className="border-t border-rule bg-surface">
      <div className="mx-auto max-w-[1240px] px-5 py-16 sm:px-8 lg:py-24">
        <h2 id="architecture-heading" className="text-[30px] leading-[1.15] font-semibold tracking-tight sm:text-[36px]">
          <Highlight>How Chak is built</Highlight>
        </h2>
        <p className="mt-4 max-w-[62ch] text-[17px] leading-[1.65] text-ink-2">
          Eight parts behind one request. Open one to see what happens there, in the order it happens.
        </p>

        {/* Few boxes, each a door: the detail is one click away instead of all on screen. */}
        <ul className="mt-10 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {PARTS.map((part) => {
            const active = openId === part.id
            return (
              <li key={part.id} className="min-w-0">
                <button
                  type="button"
                  aria-expanded={active}
                  aria-controls={PANEL_ID}
                  onClick={() => toggle(part.id)}
                  className={cn(
                    'flex h-full min-h-[4.5rem] w-full flex-col items-start justify-center gap-1 rounded-xl border bg-paper px-3 py-3 text-left transition-colors sm:px-4',
                    active ? 'border-ink ring-1 ring-ink ring-inset' : 'border-rule-strong hover:border-ink',
                  )}
                >
                  <span className="text-[15px] font-medium text-ink">{part.name}</span>
                  <span className="max-w-full text-[12px] leading-snug text-ink-3 [overflow-wrap:anywhere]">
                    {part.gist}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>

        {!open && (
          <p className="mt-4 text-[13px] text-ink-3">Select a part to see what happens behind it.</p>
        )}

        <div className="disclosure" data-state={open ? 'open' : 'closed'}>
          <div>
            <div
              id={PANEL_ID}
              role="region"
              aria-labelledby={`${PANEL_ID}-heading`}
              inert={!open}
              className="mt-6 rounded-2xl border border-rule bg-paper px-4 py-6 sm:px-6"
            >
              <PartPanel part={shown} />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
