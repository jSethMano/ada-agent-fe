import { useId, useState, type ReactNode } from 'react'
import { CaretRightIcon } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import {
  isCheck,
  type CheckAnswer,
  type CheckEntry,
  type ToolCallEntry,
  type TraceEntry,
} from '@/lib/api/types'

/** ItAgent replies `{ result: ... }`. Unwrap one level for previews, but never
 *  for the expanded view, which shows exactly what came back over the wire. */
function unwrapResult(result: unknown): unknown {
  if (result && typeof result === 'object' && !Array.isArray(result) && 'result' in result) {
    return (result as { result: unknown }).result
  }
  return result
}

function truncate(value: string, max = 56): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value
}

function scalarPairs(value: unknown, max: number): string[] {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return [truncate(String(value))]
  }
  return Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v === null || ['string', 'number', 'boolean'].includes(typeof v))
    .slice(0, max)
    .map(([k, v]) => `${k}: ${truncate(String(v), 34)}`)
}

function formatDuration(ms: number): string {
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(2)}s`
}

/** Two decimals: enough to read a probability, not enough to imply precision. */
function formatValue(value: unknown): string {
  return typeof value === 'number' ? value.toFixed(2) : String(value)
}

function Stat({ value, label, emphasis }: { value: string; label: string; emphasis?: boolean }) {
  return (
    <span className="whitespace-nowrap">
      <span className={cn('tabular-nums', emphasis ? 'font-medium text-accent-ink' : 'text-ink-2')}>
        {value}
      </span>{' '}
      <span className="text-ink-3">{label}</span>
    </span>
  )
}

/** The disclosure both row kinds share: a summary that toggles, and the full
 *  payload collapsed beneath it. */
function DisclosureRow({
  ordinal,
  ms,
  summary,
  panes,
}: {
  ordinal: number
  ms?: number
  summary: ReactNode
  panes: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const panelId = useId()

  return (
    <div className="border-t border-rule first:border-t-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className="group grid w-full grid-cols-[1.5rem_1fr_auto] items-start gap-x-2 px-2.5 py-2.5 text-left transition-colors hover:bg-accent-wash sm:grid-cols-[1.75rem_1fr_auto] sm:gap-x-3 sm:px-3"
      >
        <span className="pt-px font-mono text-[11px] tabular-nums text-ink-3">
          {String(ordinal).padStart(2, '0')}
        </span>

        <span className="min-w-0">{summary}</span>

        <span className="flex items-start gap-2.5">
          {ms !== undefined && (
            <span className="pt-px font-mono text-[11px] tabular-nums text-ink-3">
              {formatDuration(ms)}
            </span>
          )}
          <CaretRightIcon
            aria-hidden
            weight="bold"
            className={cn(
              'mt-0.5 size-3 shrink-0 text-ink-3 transition-transform duration-150',
              open && 'rotate-90',
            )}
          />
        </span>
        <span className="sr-only">{open ? 'Hide' : 'Show'} full payload</span>
      </button>

      <div className="disclosure" data-state={open ? 'open' : 'closed'}>
        <div>
          {/* inert keeps the collapsed payload out of the focus order and the
              accessibility tree while the grid row is animating to 0fr. */}
          <div id={panelId} inert={!open} className="grid gap-px bg-rule sm:grid-cols-2">
            {panes}
          </div>
        </div>
      </div>
    </div>
  )
}

function ToolRow({ entry, ordinal }: { entry: ToolCallEntry; ordinal: number }) {
  const argPreview = scalarPairs(entry.args, 2)
  const resultPreview = scalarPairs(unwrapResult(entry.result), 3)

  return (
    <DisclosureRow
      ordinal={ordinal}
      ms={entry.ms}
      summary={
        <>
          <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <code className="font-mono text-[13px] font-medium text-ink">{entry.tool}</code>
            {argPreview.map((pair) => (
              <code key={pair} className="font-mono text-[11.5px] text-ink-3">
                {pair}
              </code>
            ))}
          </span>
          {resultPreview.length > 0 && (
            <span className="mt-1 flex flex-wrap items-baseline gap-x-2">
              <span aria-hidden className="font-mono text-[11.5px] text-ink-3">
                returned
              </span>
              {resultPreview.map((pair) => (
                <code key={pair} className="font-mono text-[11.5px] text-ink-2">
                  {pair}
                </code>
              ))}
            </span>
          )}
        </>
      }
      panes={
        <>
          <Payload label="args" value={entry.args} />
          <Payload label="result" value={entry.result} />
        </>
      }
    />
  )
}

/** The fourth column: confidence where the answer type has one, and the word
 *  "flagged" so a flag never depends on colour alone. */
function answerNote(answer: CheckAnswer): string {
  const notes: string[] = []
  if ('confidence' in answer && typeof answer.confidence === 'number') {
    notes.push(`conf ${formatValue(answer.confidence)}`)
  }
  if (answer.flagged) notes.push('flagged')
  return notes.join(' · ')
}

function AnswerLine({ answer }: { answer: CheckAnswer }) {
  const tone = answer.flagged ? 'text-danger' : 'text-ink-3'
  return (
    // `contents` lets the four cells join the parent grid, so ids, types, and
    // values line up in columns across every answer in the check.
    <span className="contents">
      <code className="font-mono text-[11.5px] text-ink-3">{answer.id}</code>
      <code className="font-mono text-[11.5px] text-ink-3">{answer.type}</code>
      <code className={cn('font-mono text-[11.5px] tabular-nums', answer.flagged ? 'text-danger' : 'text-ink-2')}>
        {formatValue(answer.value)}
      </code>
      <code className={cn('font-mono text-[11.5px]', tone)}>{answerNote(answer)}</code>
    </span>
  )
}

/**
 * A Jev check. The name is prefixed `jev.` so it can never be mistaken for a
 * tool the router chose to call: checks run alongside the loop, and nothing in
 * the loop reads them. A skipped or failed check still gets its row, in muted
 * ink rather than danger, because a missing annotation is not an alarm.
 */
function CheckRow({ entry, ordinal }: { entry: CheckEntry; ordinal: number }) {
  const meta = {
    model: entry.model,
    status: entry.status,
    reason: entry.reason,
    inputTokens: entry.inputTokens,
  }

  return (
    <DisclosureRow
      ordinal={ordinal}
      ms={entry.ms}
      summary={
        <>
          <code className="font-mono text-[13px] font-medium text-ink">jev.{entry.check}</code>
          {entry.status === 'ok' ? (
            <span className="mt-1 grid grid-cols-[auto_auto_auto_1fr] items-baseline gap-x-3 gap-y-0.5">
              {entry.answers.map((answer) => (
                <AnswerLine key={answer.id} answer={answer} />
              ))}
            </span>
          ) : (
            <code className="mt-1 block font-mono text-[11.5px] text-ink-3">
              {entry.status} · {entry.reason ?? 'unknown'}
            </code>
          )}
        </>
      }
      panes={
        <>
          <Payload label="answers" value={entry.answers} />
          <Payload label="meta" value={meta} />
        </>
      }
    />
  )
}

function Payload({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="bg-paper px-3 py-2.5">
      <p className="mb-1.5 font-mono text-[11px] tracking-wide text-ink-3">{label}</p>
      {/* Phones wrap long strings instead of hiding them behind a sideways
          scroll. Same characters and indentation; only the line breaks differ. */}
      <pre className="overflow-x-auto font-mono text-[11.5px] leading-relaxed whitespace-pre-wrap text-ink-2 [overflow-wrap:anywhere] sm:whitespace-pre sm:[overflow-wrap:normal]">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  )
}

interface TraceProps {
  trace: TraceEntry[]
  iterations?: number
  elapsedMs?: number
  /** The turn ended in an error (out of passes, or a call that threw). */
  failed?: boolean
}

/**
 * Rendered ABOVE the answer, because that is the order it happened in. Putting
 * the trace after the answer would misrepresent the turn.
 *
 * Note on iterations: the Worker returns a flat `trace` with no per-entry
 * iteration index, so rows are numbered by call order and `iterations` is
 * reported as its own fact rather than faked into groups. When more than one
 * pass ran, the count is the only coloured thing in the block, which is what
 * makes a multi-pass turn perceptible at a glance.
 *
 * Tool calls and checks share one ordinal sequence, because that is the order
 * they started in, but are counted separately: a check is not something the
 * router decided to do, and it never counts as an iteration.
 */
export function Trace({ trace, iterations, elapsedMs, failed }: TraceProps) {
  const multiPass = (iterations ?? 1) > 1
  const toolCount = trace.filter((entry) => !isCheck(entry)).length
  const checkCount = trace.length - toolCount

  if (trace.length === 0 && !failed) {
    return (
      <div className="mt-3 border-l-2 border-rule pl-3">
        <p className="font-mono text-[11.5px] text-ink-3">
          answered directly, no tools called
          {iterations ? ` · ${iterations} iteration` : ''}
          {elapsedMs !== undefined ? ` in ${formatDuration(elapsedMs)}` : ''}
        </p>
      </div>
    )
  }

  return (
    <section
      aria-label="Trace"
      className={cn('mt-3 border-l-2', failed ? 'border-danger' : 'border-rule-strong')}
    >
      <header className="flex flex-wrap items-baseline gap-x-5 gap-y-1 pb-2 pl-2 sm:pl-3">
        <span className="font-mono text-[11px] tracking-wide text-ink-3">router loop</span>
        {iterations !== undefined && (
          <Stat
            value={String(iterations)}
            label={iterations === 1 ? 'iteration' : 'iterations'}
            emphasis={multiPass}
          />
        )}
        {/* With a check row present the trace is never empty, so the
            direct-answer case is named here instead of as "0 tool calls". */}
        {toolCount === 0 && !failed ? (
          <span className="whitespace-nowrap text-ink-3">answered directly</span>
        ) : (
          <Stat value={String(toolCount)} label={toolCount === 1 ? 'tool call' : 'tool calls'} />
        )}
        {checkCount > 0 && (
          <Stat value={String(checkCount)} label={checkCount === 1 ? 'check' : 'checks'} />
        )}
        {elapsedMs !== undefined && <Stat value={formatDuration(elapsedMs)} label="roundtrip" />}
      </header>

      <div className="ml-2 border border-rule bg-surface sm:ml-3">
        {trace.map((entry, index) =>
          isCheck(entry) ? (
            <CheckRow key={`check-${index}`} entry={entry} ordinal={index + 1} />
          ) : (
            <ToolRow key={`tool-${index}`} entry={entry} ordinal={index + 1} />
          ),
        )}
        {failed && toolCount === 0 && (
          <p className="border-t border-rule px-3 py-2.5 font-mono text-[11.5px] text-ink-3 first:border-t-0">
            no tool calls recorded before the loop stopped
          </p>
        )}
      </div>
    </section>
  )
}
