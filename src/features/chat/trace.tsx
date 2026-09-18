import { useId, useState } from 'react'
import { CaretRightIcon } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import type { TraceEntry } from '@/lib/api/types'

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

function TraceRow({ entry, ordinal }: { entry: TraceEntry; ordinal: number }) {
  const [open, setOpen] = useState(false)
  const panelId = useId()

  const argPreview = scalarPairs(entry.args, 2)
  const resultPreview = scalarPairs(unwrapResult(entry.result), 3)

  return (
    <div className="border-t border-rule first:border-t-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className="group grid w-full grid-cols-[1.75rem_1fr_auto] items-start gap-x-3 px-3 py-2.5 text-left transition-colors hover:bg-accent-wash"
      >
        <span className="pt-px font-mono text-[11px] tabular-nums text-ink-3">
          {String(ordinal).padStart(2, '0')}
        </span>

        <span className="min-w-0">
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
        </span>

        <CaretRightIcon
          aria-hidden
          weight="bold"
          className={cn(
            'mt-0.5 size-3 shrink-0 text-ink-3 transition-transform duration-150',
            open && 'rotate-90',
          )}
        />
        <span className="sr-only">{open ? 'Hide' : 'Show'} full payload</span>
      </button>

      <div className="disclosure" data-state={open ? 'open' : 'closed'}>
        <div>
          {/* inert keeps the collapsed payload out of the focus order and the
              accessibility tree while the grid row is animating to 0fr. */}
          <div id={panelId} inert={!open} className="grid gap-px bg-rule sm:grid-cols-2">
            <Payload label="args" value={entry.args} />
            <Payload label="result" value={entry.result} />
          </div>
        </div>
      </div>
    </div>
  )
}

function Payload({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="bg-paper px-3 py-2.5">
      <p className="mb-1.5 font-mono text-[10.5px] tracking-wide text-ink-3">{label}</p>
      <pre className="overflow-x-auto font-mono text-[11.5px] leading-relaxed whitespace-pre text-ink-2">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  )
}

interface TraceProps {
  trace: TraceEntry[]
  iterations?: number
  elapsedMs?: number
  overran?: boolean
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
 */
export function Trace({ trace, iterations, elapsedMs, overran }: TraceProps) {
  const multiPass = (iterations ?? 1) > 1

  if (trace.length === 0 && !overran) {
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
      aria-label="Tool call trace"
      className={cn('mt-3 border-l-2', overran ? 'border-danger' : 'border-rule-strong')}
    >
      <header className="flex flex-wrap items-baseline gap-x-5 gap-y-1 pb-2 pl-3">
        <span className="font-mono text-[11px] tracking-wide text-ink-3">router loop</span>
        {iterations !== undefined && (
          <Stat
            value={String(iterations)}
            label={iterations === 1 ? 'iteration' : 'iterations'}
            emphasis={multiPass}
          />
        )}
        <Stat
          value={String(trace.length)}
          label={trace.length === 1 ? 'tool call' : 'tool calls'}
        />
        {elapsedMs !== undefined && <Stat value={formatDuration(elapsedMs)} label="roundtrip" />}
      </header>

      <div className="ml-3 border border-rule bg-surface">
        {trace.map((entry, index) => (
          <TraceRow key={`${entry.tool}-${index}`} entry={entry} ordinal={index + 1} />
        ))}
        {trace.length === 0 && (
          <p className="px-3 py-2.5 font-mono text-[11.5px] text-ink-3">
            no tool calls recorded before the loop stopped
          </p>
        )}
      </div>
    </section>
  )
}
