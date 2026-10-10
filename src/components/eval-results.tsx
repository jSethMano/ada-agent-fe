import { ArrowUpRightIcon } from '@phosphor-icons/react'
import { Answer } from '@/features/chat/answer'
import { Notice } from '@/features/chat/notice'
import { Trace } from '@/features/chat/trace'
import { EVALS, FEATURED_COPY, percent, type EvalRun, type EvalSide, type EvalStep } from '@/lib/evals'
import { PUBLISHED_REPOS } from '@/lib/site'
import { cn } from '@/lib/utils'

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

const KICKER = 'border-b border-rule-strong pb-2 font-pixel text-[11px] tracking-wide text-ink-3'

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
              <span className="block font-mono text-[12px] text-ink">{run.label}</span>
              <span className="block font-mono text-[11px] text-ink-3">
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
                    className={cn('py-2.5 pl-3 text-right align-top font-mono', between(index, runs.length))}
                  >
                    {tally ? (
                      <>
                        <span className="block text-[13px] text-ink">{percent(tally)}</span>
                        <span className="block text-[11px] text-ink-3">
                          {tally.passed}/{tally.graded}
                        </span>
                        {tally.ungraded > 0 && (
                          <span className="block text-[11px] text-ink-3">{tally.ungraded} ungraded</span>
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

/** A read-only copy of the approval card as it was shown in that run. */
function CardSnapshot({ approval }: { approval: NonNullable<EvalStep['approval']> }) {
  return (
    <div className="mt-3 max-w-[68ch] border border-rule-strong bg-paper px-3 py-2.5">
      <p className="font-mono text-[11px] text-ink-3">
        approval card · {approval.priority ?? 'untriaged'}
      </p>
      <p className="mt-1 text-[14px] leading-snug text-ink [overflow-wrap:anywhere]">{approval.args.title}</p>
      {approval.args.description && (
        <p className="mt-0.5 text-[13px] leading-relaxed whitespace-pre-wrap text-ink-2 [overflow-wrap:anywhere]">
          {approval.args.description}
        </p>
      )}
      {approval.notice && <Notice text={approval.notice} />}
    </div>
  )
}

function StepView({ step }: { step: EvalStep }) {
  const { request } = step
  const paused = Boolean(step.approval) && step.answer === undefined
  const failed = step.status >= 400

  return (
    <div className="mt-4">
      <p className="font-mono text-[11px] text-ink-3">you</p>
      <p className="mt-0.5 max-w-[68ch] text-[14px] leading-relaxed text-ink [overflow-wrap:anywhere]">
        {request.kind === 'question'
          ? request.text
          : request.action === 'cancel'
            ? 'Chose not to file the ticket.'
            : request.edits
              ? 'Approved the ticket, with edits.'
              : 'Approved the ticket.'}
      </p>
      <Trace trace={step.trace} iterations={step.iterations} failed={failed} approval={paused ? 'paused' : undefined} />
      {step.approval && <CardSnapshot approval={step.approval} />}
      {step.answer !== undefined && <Answer text={step.answer} />}
      {step.notice && <Notice text={step.notice} />}
      {failed && step.error && (
        <p className="mt-2 font-mono text-[11.5px] text-danger">
          {step.status} · {step.error}
        </p>
      )}
    </div>
  )
}

function SideView({ kind, side }: { kind: 'before' | 'after'; side: EvalSide }) {
  const passed = side.status === 'pass'
  return (
    <div className="min-w-0 border-t border-rule pt-3">
      <p className="font-mono text-[11.5px] text-ink-3">
        {kind} · {side.label} · run {side.rep} ·{' '}
        <span className={passed ? 'text-ink' : 'text-danger'}>{STATUS_WORD[side.status] ?? side.status}</span>
      </p>
      {/* The run shown is one of several, so say how the case did across all of them. */}
      <p className="font-mono text-[11px] text-ink-3">
        {side.caseRuns.passed} of {side.caseRuns.total} {side.caseRuns.total === 1 ? 'run' : 'runs'} passed in{' '}
        {side.label}
      </p>
      {side.steps.map((step, index) => (
        <StepView key={index} step={step} />
      ))}
      {side.failedChecks.length > 0 && (
        <ul className="mt-4 space-y-0.5 border-t border-rule pt-2.5">
          {side.failedChecks.map((check) => (
            <li
              key={`${check.step}-${check.name}`}
              className="font-mono text-[11.5px] leading-relaxed text-danger [overflow-wrap:anywhere]"
            >
              failed · step {check.step} · {check.name}
              {check.detail ? `: ${check.detail}` : ''}
            </li>
          ))}
        </ul>
      )}
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
        <h2 id="evals-heading" className="font-pixel text-[30px] leading-[1.15] text-ink sm:text-[36px]">
          How he's measured
        </h2>
        <p className="mt-4 max-w-[62ch] font-pixel text-[17px] leading-[1.65] text-ink-2">
          Each change to Chak is run against {method.cases} written cases, {method.liveReps} times each,
          and every run is graded from the trace he returns. Nothing below is typed in: the numbers and
          traces are exported from the saved runs.
        </p>

        <p className="mt-5 font-mono text-[11.5px] leading-relaxed text-ink-3">
          {method.cases} cases · {method.steps} steps · {method.liveReps} runs per live case · judge{' '}
          {method.judge.model} v{method.judge.version}, ungraded below {method.judge.floor}
        </p>
        <p className="mt-1 font-mono text-[11.5px] leading-relaxed text-ink-3">
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
                <h4 id={`eval-${item.caseId}`} className="font-pixel text-[20px] leading-snug text-ink">
                  {copy.title}
                </h4>
                <p className="mt-2 max-w-[68ch] text-[14px] leading-relaxed text-ink-2">{copy.caption}</p>
                <p className="mt-2 font-mono text-[11px] text-ink-3">
                  {item.caseId} · {CATEGORY_LABEL[item.category] ?? item.category}
                </p>
                <div className="mt-4 grid grid-cols-1 gap-x-8 gap-y-8 lg:grid-cols-2">
                  <SideView kind="before" side={item.before} />
                  <SideView kind="after" side={item.after} />
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
