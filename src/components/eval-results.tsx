import { ArrowUpIcon, ArrowUpRightIcon, CheckIcon, XIcon } from '@phosphor-icons/react'
import { Answer } from '@/features/chat/answer'
import { TriageLine } from '@/features/chat/approval-card'
import { Notice } from '@/features/chat/notice'
import { Trace } from '@/features/chat/trace'
import { ChakReply, VisitorMessage } from '@/features/chat/turn'
import { EVALS, FEATURED_COPY, percent, type EvalRequest, type EvalRun, type EvalSide, type EvalStep } from '@/lib/evals'
import { PUBLISHED_REPOS } from '@/lib/site'
import { cn } from '@/lib/utils'
import { Highlight } from '@/components/highlight'

const CATEGORY_LABEL: Record<string, string> = {
  normal_it: 'normal IT',
  tickets: 'tickets',
  ambiguous: 'ambiguous',
  unsupported: 'unsupported',
  out_of_scope: 'out of scope',
  adversarial: 'prompt injection',
  tool_misuse: 'tool misuse',
  scripted_failure: 'scripted failures',
}

const STATUS_WORD: Record<string, string> = { pass: 'pass', fail: 'fail', known_gap: 'known gap', ungraded: 'ungraded' }

const KICKER = 'border-b border-rule-strong pb-2 text-[12px] font-medium tracking-wide text-ink-3'

function runDate(run: EvalRun): string {
  return new Date(run.startedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

/** Below sm only the first and last runs fit a 320px row, so the ones between
 *  step aside there. The table keeps every run from sm up. */
function between(index: number, count: number) {
  return index > 0 && index < count - 1 ? 'hidden sm:table-cell' : undefined
}

function ResultsTable() {
  const { runs, method } = EVALS
  return (
    <table className="mt-5 w-full border-collapse text-left">
      <caption className="sr-only">Eval results by run. Each cell is passed over graded.</caption>
      <thead>
        <tr className="border-b border-rule-strong">
          <th scope="col" className="py-2 pr-3 align-bottom text-[12.5px] font-normal text-ink-3">
            metric
          </th>
          {runs.map((run, index) => (
            <th
              key={run.file}
              scope="col"
              className={cn('py-2 pl-3 text-right align-bottom font-normal', between(index, runs.length))}
            >
              <span className="block text-[13px] text-ink">{run.label}</span>
              <span className="block text-[12px] text-ink-3">
                {runDate(run)} · {run.commit}
              </span>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {method.metrics.map((metric) => {
          const overall = metric.id === 'overall'
          return (
            <tr
              key={metric.id}
              className={cn('border-b border-rule', overall && 'border-t-2 border-b-0 border-t-rule-strong')}
            >
              <th scope="row" className="py-2.5 pr-3 align-top font-normal">
                <span className={cn('block text-[13.5px] leading-snug', overall ? 'text-ink' : 'text-ink-2')}>
                  {metric.label}
                </span>
                <span className="mt-0.5 hidden max-w-[52ch] text-[12.5px] leading-snug text-ink-3 sm:block">
                  {metric.definition}
                </span>
              </th>
              {runs.map((run, index) => {
                const tally = run.metrics[metric.id]
                return (
                  <td
                    key={run.file}
                    className={cn('py-2.5 pl-3 text-right align-top tabular-nums', between(index, runs.length))}
                  >
                    {tally ? (
                      <>
                        <span className="block text-[13px] text-ink">{percent(tally)}</span>
                        <span className="block text-[12px] text-ink-3">
                          {tally.passed}/{tally.graded}
                        </span>
                        {tally.ungraded > 0 && (
                          <span className="block text-[12px] text-ink-3">{tally.ungraded} ungraded</span>
                        )}
                      </>
                    ) : (
                      <span className="text-[13px] text-ink-3">—</span>
                    )}
                  </td>
                )
              })}
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

/** The approval card as it was shown in that run, minus its buttons: what the
 *  visitor pressed is the next "you" row, the same order it happened in. */
function CardSnapshot({ approval, ended }: { approval: NonNullable<EvalStep['approval']>; ended: boolean }) {
  return (
    <div className="mt-3 max-w-[68ch] rounded-xl border border-rule-strong bg-paper px-3.5 py-3 sm:px-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="text-[14px] font-medium text-ink">File this ticket?</p>
        <code className="text-[12px] text-ink-3">approval card</code>
      </div>
      {approval.notice && <Notice text={approval.notice} />}
      <dl className="mt-3 space-y-2.5">
        <div>
          <dt className="text-[12px] text-ink-3">title</dt>
          <dd className="mt-0.5 text-[15px] leading-snug text-ink [overflow-wrap:anywhere]">{approval.args.title}</dd>
        </div>
        {approval.args.description && (
          <div>
            <dt className="text-[12px] text-ink-3">description</dt>
            <dd className="mt-0.5 text-[14px] leading-relaxed whitespace-pre-wrap text-ink-2 [overflow-wrap:anywhere]">
              {approval.args.description}
            </dd>
          </div>
        )}
      </dl>
      <div className="mt-3 border-t border-rule pt-2.5">
        <TriageLine approval={approval} />
      </div>
      {ended && (
        <p className="mt-2.5 text-[12.5px] leading-relaxed text-ink-3">
          The run ended at the card, so nothing was filed.
        </p>
      )}
    </div>
  )
}

/** The card's button the visitor pressed, drawn as it looked. Not a control:
 *  the run is over. */
function DecisionView({ request }: { request: Extract<EvalRequest, { kind: 'decision' }> }) {
  const approved = request.action === 'approve'
  const Icon = approved ? CheckIcon : XIcon
  const edits = request.edits ?? {}
  const edited = (['title', 'description'] as const).filter((field) => edits[field] !== undefined)

  return (
    // The visitor's act, so it sits on their side of the thread.
    <div className="flex max-w-[85%] flex-col items-end self-end">
      <p className="flex flex-wrap items-center justify-end gap-x-2.5 gap-y-1">
        <span className="sr-only">You: </span>
        <span
          // Drawn in the card's own colours: green for File ticket, red for Don't file.
          className={cn(
            'inline-flex h-7 items-center gap-1 rounded-md px-2.5 text-[12.5px]',
            approved ? 'bg-success text-success-foreground' : 'bg-danger-wash text-danger',
          )}
        >
          <Icon aria-hidden weight="bold" className="size-3.5" />
          {approved ? 'File ticket' : 'Don’t file'}
        </span>
        <span className="text-[12px] text-ink-3">
          pressed on the card{edited.length > 0 ? ` · edited ${edited.join(', ')}` : ''}
        </span>
      </p>
      {edited.map((field) => (
        <p key={field} className="mt-1.5 max-w-[68ch] text-right text-[14px] leading-relaxed text-ink-2 [overflow-wrap:anywhere]">
          <span className="mr-2 text-[12px] text-ink-3">{field}</span>
          {edits[field]}
        </p>
      ))}
    </div>
  )
}

function ReplayStep({ step, first, last }: { step: EvalStep; first: boolean; last: boolean }) {
  const { request } = step
  const paused = Boolean(step.approval) && step.answer === undefined
  const failed = step.status >= 400

  return (
    // A decision carries on the turn it answers, so only a question starts a
    // new one, with the space the live thread leaves between turns.
    <div className={cn('flex flex-col gap-3', request.kind === 'question' && !first && 'mt-5')}>
      {request.kind === 'question' ? (
        <VisitorMessage>{request.text}</VisitorMessage>
      ) : (
        <DecisionView request={request} />
      )}
      <ChakReply>
        <Trace
          trace={step.trace}
          iterations={step.iterations}
          failed={failed}
          approval={paused ? 'paused' : undefined}
        />
        {step.approval && <CardSnapshot approval={step.approval} ended={paused && last} />}
        {step.answer !== undefined && <Answer text={step.answer} />}
        {step.notice && <Notice text={step.notice} />}
        {failed && step.error && (
          <p className="mt-3 rounded-xl bg-danger-wash px-3.5 py-3 text-[12.5px] leading-relaxed text-danger [overflow-wrap:anywhere]">
            {step.status} · {step.error}
          </p>
        )}
      </ChakReply>
    </div>
  )
}

/** One recorded run, framed like the live console: a header strip, the thread,
 *  and the composer bar. Read only, and nothing in it scrolls on its own. */
function ReplayConsole({ kind, side }: { kind: 'before' | 'after'; side: EvalSide }) {
  const passed = side.status === 'pass'
  return (
    <div className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-rule bg-surface">
      <header className="border-b border-rule px-4 py-2.5 sm:px-6">
        <p className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
          <span className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-[12px] text-ink-3">{kind}</span>
            <code className="text-[13px] text-ink-2">
              {side.label} · run {side.rep}
            </code>
          </span>
          <span className={cn('text-[13px]', passed ? 'text-ink' : 'text-danger')}>
            {STATUS_WORD[side.status] ?? side.status}
          </span>
        </p>
        {/* The run shown is one of several, so say how the case did across all of them. */}
        <p className="mt-0.5 text-[12px] text-ink-3">
          {side.caseRuns.passed} of {side.caseRuns.total} {side.caseRuns.total === 1 ? 'run' : 'runs'} passed in{' '}
          {side.label}
        </p>
      </header>

      <div className="flex flex-1 flex-col gap-3 px-4 py-4 sm:px-6">
        {side.steps.map((step, index) => (
          <ReplayStep key={index} step={step} first={index === 0} last={index === side.steps.length - 1} />
        ))}
      </div>

      {/* What the grader marked down, under the thread it read. Inside the
          frame, so both composers sit at the same height. */}
      {side.failedChecks.length > 0 && (
        <ul className="space-y-0.5 border-t border-rule px-4 py-2.5 sm:px-6">
          {side.failedChecks.map((check) => (
            <li
              key={`${check.step}-${check.name}`}
              className="text-[12.5px] leading-relaxed text-danger [overflow-wrap:anywhere]"
            >
              failed · step {check.step} · {check.name}
              {check.detail ? `: ${check.detail}` : ''}
            </li>
          ))}
        </ul>
      )}

      {/* Where the live composer sits. Drawn, not built: there is no field to
          focus and no button to press, so nothing here invites typing. */}
      <div className="border-t border-rule px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3 rounded-3xl border border-rule bg-paper py-1.5 pr-1.5 pl-5">
          <p className="flex-1 text-[14px] text-ink-3">Replay of a recorded run</p>
          <span
            aria-hidden
            className="inline-flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground opacity-50"
          >
            <ArrowUpIcon weight="bold" className="size-4" />
          </span>
        </div>
      </div>
    </div>
  )
}

export function EvalResults() {
  const { method, featured } = EVALS
  const worker = PUBLISHED_REPOS[0]
  const links = worker
    ? [
        { label: 'Iteration log', href: `${worker.url}/blob/main/evals/ITERATIONS.md` },
        { label: 'All 50 cases', href: `${worker.url}/blob/main/evals/cases.ts` },
        { label: 'Run reports', href: `${worker.url}/tree/main/evals/results` },
      ]
    : []

  return (
    <section aria-labelledby="evals-heading" className="border-t border-rule">
      <div className="mx-auto max-w-[1240px] px-5 py-16 sm:px-8 lg:py-24">
        <h2 id="evals-heading" className="text-[30px] leading-[1.15] font-semibold tracking-tight sm:text-[36px]">
          <Highlight>How he's measured</Highlight>
        </h2>
        <p className="mt-4 max-w-[62ch] text-[17px] leading-[1.65] text-ink-2">
          Each change to Chak is run against {method.cases} written cases, {method.liveReps} times each,
          and every run is graded from the trace he returns. Nothing below is typed in: the numbers and
          traces are exported from the saved runs.
        </p>

        <p className="mt-5 text-[12.5px] leading-relaxed text-ink-3">
          {method.cases} cases · {method.steps} steps · {method.liveReps} runs per live case · judge{' '}
          {method.judge.model} v{method.judge.version}, ungraded below {method.judge.floor}
        </p>
        <p className="mt-1 text-[12.5px] leading-relaxed text-ink-3">
          {method.categories.map((category) => `${CATEGORY_LABEL[category.id] ?? category.id} ${category.cases}`).join(' · ')}
        </p>

        <div className="mt-12 grid grid-cols-1 gap-x-10 gap-y-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <div className="min-w-0">
            <h3 className={KICKER}>results by run</h3>
            <ResultsTable />
            <p className="mt-3 max-w-[62ch] text-[12.5px] leading-relaxed text-ink-3">
              Every column is graded with the same answer key, and a corrected label is applied to
              earlier runs too. Iteration 1 is left out: the free model allowance ran out, so only one of
              its three runs could be measured.
            </p>
          </div>

          <div className="min-w-0">
            <h3 className={KICKER}>limits</h3>
            <ul className="mt-4 space-y-3 text-[14px] leading-relaxed text-ink-2">
              <li>The cases were written for this demo, not drawn from real traffic, and are mostly English.</li>
              <li>
                Whether he answered, asked, or declined is judged by a second model. Below its confidence
                floor a step is counted as ungraded, never as passed.
              </li>
              <li>Fifty cases is enough to catch a regression, not to put a precise number on accuracy.</li>
            </ul>
            {links.length > 0 && (
              <ul className="mt-5 space-y-1.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[13.5px] text-accent-ink underline-offset-4 hover:underline pointer-coarse:-my-3 pointer-coarse:py-3"
                    >
                      {link.label}
                      <ArrowUpRightIcon aria-hidden weight="bold" className="size-3" />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <h3 className={cn(KICKER, 'mt-16')}>what the eval caught</h3>
        <div className="mt-2 space-y-14">
          {featured.map((item) => {
            const copy = FEATURED_COPY[item.caseId]
            if (!copy) return null
            return (
              <article key={item.caseId} aria-labelledby={`eval-${item.caseId}`} className="pt-6">
                <h4 id={`eval-${item.caseId}`} className="text-[20px] leading-snug font-medium text-ink">
                  {copy.title}
                </h4>
                <p className="mt-2 max-w-[68ch] text-[14px] leading-relaxed text-ink-2">{copy.caption}</p>
                <p className="mt-2 text-[12px] text-ink-3">
                  {item.caseId} · {CATEGORY_LABEL[item.category] ?? item.category}
                </p>
                <div className="mt-4 grid grid-cols-1 gap-x-8 gap-y-8 lg:grid-cols-2">
                  <ReplayConsole kind="before" side={item.before} />
                  <ReplayConsole kind="after" side={item.after} />
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
