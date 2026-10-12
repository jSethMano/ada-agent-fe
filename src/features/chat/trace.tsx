import { Fragment, useId, useState, type ReactNode } from 'react'
import { CaretRightIcon } from '@phosphor-icons/react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  isApproval,
  isCheck,
  isToolCall,
  type ApprovalEntry,
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
 *  payload collapsed beneath it. `detail` sits under the summary and also runs
 *  under the timing column, for content that needs the row's full width. */
function DisclosureRow({
  ordinal,
  ms,
  summary,
  detail,
  panes,
}: {
  ordinal: number
  ms?: number
  summary: ReactNode
  detail?: ReactNode
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
        <span className="pt-px text-[12px] tabular-nums text-ink-3">
          {String(ordinal).padStart(2, '0')}
        </span>

        <span className="min-w-0">{summary}</span>

        <span className="flex items-start gap-2.5">
          {ms !== undefined && (
            <span className="pt-px text-[12px] tabular-nums text-ink-3">
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
        {detail && <span className="col-span-2 col-start-2 min-w-0">{detail}</span>}

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
            <code className="text-[14px] font-medium text-ink">{entry.tool}</code>
            {/* Muted, not danger: the call ran. It is marked so a rescued call
                never passes for one the model made. */}
            {entry.fromText && (
              <code className="text-[12.5px] text-ink-3">parsed from text</code>
            )}
            {argPreview.map((pair) => (
              <code key={pair} className="text-[12.5px] text-ink-3">
                {pair}
              </code>
            ))}
          </span>
          {resultPreview.length > 0 && (
            <span className="mt-1 flex flex-wrap items-baseline gap-x-2">
              <span aria-hidden className="text-[12.5px] text-ink-3">
                returned
              </span>
              {resultPreview.map((pair) => (
                <code key={pair} className="text-[12.5px] text-ink-2">
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

/** A break opportunity after each underscore. On a phone the id column can then
 *  narrow to `contradicts_` instead of pushing the value and its "flagged" note
 *  out of the row; where there is room, nothing wraps. */
function breakableId(id: string): ReactNode {
  return id.split('_').map((part, index, parts) => (
    <Fragment key={index}>
      {part}
      {index < parts.length - 1 && (
        <>
          _<wbr />
        </>
      )}
    </Fragment>
  ))
}

function AnswerLine({ answer }: { answer: CheckAnswer }) {
  const tone = answer.flagged ? 'text-danger' : 'text-ink-3'
  const note = answerNote(answer)
  return (
    // `contents` lets the cells join the parent grid, so ids, types, and values
    // line up in columns across every answer in the check. Below `sm` the grid
    // has three columns and a note drops onto its own line under the value:
    // a Choice answer's label and confidence do not fit beside it on a 320px
    // phone. An empty note takes no line there, but keeps its column at `sm`.
    <span className="contents">
      <code className="text-[12.5px] text-ink-3">{breakableId(answer.id)}</code>
      <code className="text-[12.5px] text-ink-3">{answer.type}</code>
      <code className={cn('text-[12.5px] tabular-nums', answer.flagged ? 'text-danger' : 'text-ink-2')}>
        {formatValue(answer.value)}
      </code>
      <code
        className={cn(
          'text-[12.5px]',
          tone,
          note ? 'col-start-3 sm:col-start-auto' : 'hidden sm:inline',
        )}
      >
        {note}
      </code>
    </span>
  )
}

/**
 * A Jev check. The name is prefixed `jev.` so it can never be mistaken for a
 * tool the router chose to call. When the Worker acted on the result, the
 * action is printed beside the name in danger ink. A skipped or failed check
 * still gets its row, in muted ink rather than danger, because a missing check
 * is not an alarm, and it never blocks.
 */
function CheckRow({ entry, ordinal }: { entry: CheckEntry; ordinal: number }) {
  const meta = {
    model: entry.model,
    status: entry.status,
    reason: entry.reason,
    action: entry.action,
    inputTokens: entry.inputTokens,
  }

  return (
    <DisclosureRow
      ordinal={ordinal}
      ms={entry.ms}
      summary={
        <span className="flex flex-wrap items-baseline gap-x-2">
          {/* Breakable too: on a 320px phone `jev.triage_ticket` is wider than
              its column and ran into the timing beside it. */}
          <code className="text-[14px] font-medium text-ink">jev.{breakableId(entry.check)}</code>
          {entry.action && (
            <code className="text-[12.5px] font-medium text-danger">{entry.action}</code>
          )}
        </span>
      }
      // Full width, so a long id, its value, and "flagged" still fit on a 320px
      // phone without pushing the flag out of the row.
      detail={
        entry.status === 'ok' ? (
          <span className="mt-1 grid grid-cols-[auto_auto_1fr] items-baseline gap-x-2 gap-y-0.5 sm:grid-cols-[auto_auto_auto_1fr] sm:gap-x-3">
            {entry.answers.map((answer) => (
              <AnswerLine key={answer.id} answer={answer} />
            ))}
          </span>
        ) : (
          <code className="mt-1 block text-[12.5px] text-ink-3">
            {entry.status} · {entry.reason ?? 'unknown'}
          </code>
        )
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

/**
 * The visitor's decision on a ticket that waited for approval. Prefixed
 * `human.` the way checks are prefixed `jev.`, so it can never be mistaken for
 * a call the router made. The timing is how long the ticket waited.
 */
function ApprovalRow({ entry, ordinal }: { entry: ApprovalEntry; ordinal: number }) {
  const editedFields = Object.keys(entry.edits ?? {})

  return (
    <DisclosureRow
      ordinal={ordinal}
      ms={entry.ms}
      summary={
        <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <code className="text-[14px] font-medium text-ink">human.approval</code>
          <code className="text-[12.5px] text-ink-2">{entry.decision}</code>
          <code className="text-[12.5px] text-ink-3">{entry.tool}</code>
          {editedFields.length > 0 && (
            <code className="text-[12.5px] text-ink-3">edited {editedFields.join(', ')}</code>
          )}
        </span>
      }
      panes={
        <>
          <Payload label="proposed" value={entry.proposed} />
          <Payload label="decision" value={{ decision: entry.decision, edits: entry.edits ?? null }} />
        </>
      }
    />
  )
}

function Payload({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="bg-paper px-3 py-2.5">
      <p className="mb-1.5 text-[12px] tracking-wide text-ink-3">{label}</p>
      {/* Phones wrap long strings instead of hiding them behind a sideways
          scroll. Same characters and indentation; only the line breaks differ. */}
      <pre className="overflow-x-auto font-mono text-[11.5px] leading-relaxed whitespace-pre-wrap text-ink-2 [overflow-wrap:anywhere] sm:whitespace-pre sm:[overflow-wrap:normal]">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  )
}

/** What a row's badge says: its name, and a word beside it when there is one.
 *  `alarm` is the crimson badge: the Worker acted on the check, or one of its
 *  judgments was flagged. A skipped or failed check is muted, never an alarm. */
function badgeFor(entry: TraceEntry): { name: string; note?: string; alarm: boolean } {
  if (isCheck(entry)) {
    const name = `jev.${entry.check}`
    if (entry.action) return { name, note: entry.action, alarm: true }
    if (entry.status !== 'ok') return { name, note: entry.status, alarm: false }
    if (entry.answers.some((answer) => answer.flagged)) return { name, note: 'flagged', alarm: true }
    return { name, alarm: false }
  }
  if (isApproval(entry)) return { name: 'human.approval', note: entry.decision, alarm: false }
  return { name: entry.tool, note: entry.fromText ? 'parsed from text' : undefined, alarm: false }
}

interface TraceProps {
  trace: TraceEntry[]
  iterations?: number
  elapsedMs?: number
  /** The turn ended in an error (out of passes, or a call that threw). */
  failed?: boolean
  /** The turn stopped at a ticket: still waiting for the visitor's approval,
   *  or closed without one (they sent a new message instead). `paused` is a
   *  recorded eval run that stopped there, where nobody is waiting. */
  approval?: 'waiting' | 'closed' | 'paused'
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
 *
 * An answered turn ends with the answer check, which ran after the loop on the
 * model's answer. When that check replaced the answer, the text below the trace
 * is the Worker's fixed reply, not what the model wrote. A blocked turn has one
 * row, the guard, and 0 iterations: the answer under it is the Worker's fixed
 * refusal, because the model never saw the question, so there is nothing to check.
 *
 * A turn paused on a ticket ends at the ticket's triage: nothing after it has
 * run yet. The visitor's decision adds a `human.approval` row, then the rest of
 * the turn, and the whole trace comes back together.
 */
export function Trace({ trace, iterations, elapsedMs, failed, approval }: TraceProps) {
  // One row open at a time, so the reply stays short. `shown` outlives `open`
  // so a closing panel collapses on its content instead of going blank first.
  const [open, setOpen] = useState<number | null>(null)
  const [shown, setShown] = useState<number | null>(null)
  const panelId = useId()

  const multiPass = (iterations ?? 1) > 1
  const toolCount = trace.filter(isToolCall).length
  const checkCount = trace.filter(isCheck).length
  const blocked = trace.some((entry) => isCheck(entry) && entry.action === 'blocked')
  const replaced = trace.some((entry) => isCheck(entry) && entry.action === 'replaced')
  const held = trace.some((entry) => isCheck(entry) && entry.action === 'held')

  if (trace.length === 0 && !failed) {
    return (
      <p className="mt-3 text-[12.5px] text-ink-3">
        answered directly, no tools called
        {iterations ? ` · ${iterations} iteration` : ''}
        {elapsedMs !== undefined ? ` in ${formatDuration(elapsedMs)}` : ''}
      </p>
    )
  }

  const toggle = (index: number) => {
    setOpen((current) => (current === index ? null : index))
    setShown(index)
  }
  const shownEntry = shown === null ? undefined : trace[shown]

  return (
    <section aria-label="Trace" className="mt-3">
      <header className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-[13px]">
        <span className="text-[12px] tracking-wide text-ink-3">router loop</span>
        {iterations !== undefined && (
          <Stat
            value={String(iterations)}
            label={iterations === 1 ? 'iteration' : 'iterations'}
            emphasis={multiPass}
          />
        )}
        {/* With a check row present the trace is never empty, so the
            direct-answer case is named here instead of as "0 tool calls". */}
        {blocked ? (
          <span className="whitespace-nowrap text-danger">blocked before the model ran</span>
        ) : toolCount === 0 && !failed && !approval ? (
          <span className="whitespace-nowrap text-ink-3">answered directly</span>
        ) : (
          <Stat value={String(toolCount)} label={toolCount === 1 ? 'tool call' : 'tool calls'} />
        )}
        {checkCount > 0 && (
          <Stat value={String(checkCount)} label={checkCount === 1 ? 'check' : 'checks'} />
        )}
        {held && <span className="whitespace-nowrap text-danger">ticket held</span>}
        {approval === 'waiting' && (
          <span className="whitespace-nowrap font-medium text-ink">waiting for your approval</span>
        )}
        {approval === 'closed' && <span className="whitespace-nowrap text-ink-3">ticket not filed</span>}
        {approval === 'paused' && <span className="whitespace-nowrap text-ink-3">paused for approval</span>}
        {replaced && <span className="whitespace-nowrap text-danger">answer replaced</span>}
        {elapsedMs !== undefined && <Stat value={formatDuration(elapsedMs)} label="roundtrip" />}
      </header>

      {/* Every call stays visible as a badge, in the order it ran; its detail
          opens underneath on demand. A row the Worker acted on, or with a
          flagged judgment, is crimson and says why, so nothing that matters
          hides behind a click. */}
      <ul className="mt-2 flex flex-wrap gap-1.5">
        {trace.map((entry, index) => {
          const badge = badgeFor(entry)
          const isOpen = open === index
          return (
            <li key={index}>
              <Badge asChild variant={isOpen ? 'default' : badge.alarm ? 'destructive' : 'outline'}>
                <button
                  type="button"
                  onClick={() => toggle(index)}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  className="h-6 cursor-pointer gap-1.5 px-2.5 text-[12.5px] font-normal outline-none active:translate-y-px pointer-coarse:h-11 pointer-coarse:px-4"
                >
                  <span className="font-medium">{badge.name}</span>
                  {badge.note && (
                    <span className={cn(!isOpen && !badge.alarm && 'text-ink-3')}>{badge.note}</span>
                  )}
                </button>
              </Badge>
            </li>
          )
        })}
      </ul>

      {failed && toolCount === 0 && (
        <p className="mt-2 text-[12.5px] text-ink-3">no tool calls recorded before the loop stopped</p>
      )}

      <div className="disclosure" data-state={open !== null ? 'open' : 'closed'}>
        <div>
          {/* inert keeps a closed panel out of the focus order and the
              accessibility tree while the grid row animates to 0fr. */}
          <div
            id={panelId}
            inert={open === null}
            className="mt-2 overflow-hidden rounded-xl border border-rule bg-surface"
          >
            {shownEntry !== undefined && shown !== null && (
              isCheck(shownEntry) ? (
                <CheckRow entry={shownEntry} ordinal={shown + 1} />
              ) : isApproval(shownEntry) ? (
                <ApprovalRow entry={shownEntry} ordinal={shown + 1} />
              ) : (
                <ToolRow entry={shownEntry} ordinal={shown + 1} />
              )
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
