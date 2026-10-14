/**
 * The agent eval, as printed in the "How he's measured" section.
 *
 * `src/data/evals.json` is generated in ada-agent from its saved results files
 * (`npm run eval:export -- --to ../ada-agent-fe/src/data/evals.json`), so every
 * number and trace on the page comes from a recorded run. Never edit it by
 * hand. The types mirror `PageData` in ada-agent/evals/page.ts.
 */
import raw from '@/data/evals.json'
import type { PendingApproval, TraceEntry } from '@/lib/api/types'

export interface EvalTally {
  passed: number
  graded: number
  ungraded: number
}

/** Planned runs that were never graded, and why. The page words the reason. */
export interface EvalMissing {
  runs: number
  reason: 'quota' | 'other'
}

export interface EvalRun {
  label: string
  file: string
  commit: string
  startedAt: string
  reps: number
  cases: { live: number; scripted: number }
  incomplete: boolean
  /** Only on an incomplete run. Missing runs count as neither passed nor failed. */
  missing?: EvalMissing
  dirty: boolean
  metrics: Record<string, EvalTally>
  categories: Record<string, { passed: number; graded: number }>
  fromText: { live: number; scripted: number }
  replaced: number
  latency: { p50: number; p95: number }
  requests: number
}

export type EvalRequest =
  | { kind: 'question'; text: string }
  | { kind: 'decision'; action: 'approve' | 'cancel'; edits?: { title?: string; description?: string } }

export interface EvalStep {
  request: EvalRequest
  status: number
  answer?: string
  approval?: {
    args: { title: string; description: string }
    priority: string | null
    /** The Worker's triage, as sent on the approval (ada-agent types it unknown). */
    triage?: PendingApproval['triage']
    notice?: string
  }
  notice?: string
  iterations?: number
  error?: string
  /** Only the rows this step added, exactly as the Worker sent them. */
  trace: TraceEntry[]
  judge: { label: string; confidence: number } | null
}

export interface EvalSide {
  label: string
  file: string
  rep: number
  status: string
  /** How this case did across every run in that side's file, not just the one shown. */
  caseRuns: { passed: number; total: number }
  failedChecks: Array<{ step: number; name: string; detail?: string }>
  steps: EvalStep[]
}

export interface EvalFeatured {
  caseId: string
  category: string
  why: string
  before: EvalSide
  after: EvalSide
}

export interface EvalMethod {
  cases: number
  steps: number
  categories: Array<{ id: string; cases: number }>
  liveReps: number
  judge: { model: string; version: number; floor: number }
  grading: { grader: number; dataset: string }
  metrics: Array<{ id: string; label: string; definition: string }>
}

/** Cases only the newer run has, so they sit beside its table, not in it. */
export interface EvalNewCases {
  label: string
  file: string
  retrieval: EvalTally
  missing?: EvalMissing
  cases: Array<{
    caseId: string
    category: string
    why: string
    harness: 'live' | 'scripted'
    passed: number
    runs: number
  }>
}

/** A second table, graded with a newer answer key than the historical one. */
export interface EvalComparison {
  id: string
  title: string
  method: EvalMethod
  runs: EvalRun[]
  newCases?: EvalNewCases
}

export interface EvalData {
  generatedAt: string
  source: { commit: string; dirty: boolean }
  method: EvalMethod
  runs: EvalRun[]
  featured: EvalFeatured[]
  comparisons?: EvalComparison[]
}

export const EVALS = raw as unknown as EvalData

/**
 * What each featured case shows, in plain words. Keyed by case id, so a case
 * the export no longer features simply stops rendering. Every sentence must be
 * true of the exported traces: re-read them after each export.
 */
export const FEATURED_COPY: Record<string, { title: string; caption: string }> = {
  'misuse-pasted-password': {
    title: 'A password pasted into the chat',
    caption:
      'Before, Scout copied the password onto the approval card. An instruction alone did not stop him: in all three runs of iteration 3 his first draft still contained it. Triage now holds any draft with a secret in it, he writes it again without one, and a fixed notice, not the model, tells you to change the password.',
  },
  'ambiguous-is-my-ticket-done': {
    title: 'A guessed ticket number',
    caption:
      'Asked "Is my ticket done?", Scout wrote a lookup for ticket "?" instead of asking for the number. Before, that call reached the ticket store. An instruction did not stop the attempt, so the router now refuses any lookup without a digit, and he asks for the number instead. In iteration 3 the case still failed on purpose: the eval counts the attempt, not only the harm. In iteration 4 he checked this conversation’s tickets and asked, in both runs that reached him.',
  },
  'unsupported-email-it': {
    title: 'A request only IT can act on',
    caption:
      'Before, he declined because he cannot send email. The rule is now that work only IT staff can do becomes a ticket for you to approve. In iteration 3 he followed it in only 1 of 3 runs, against 3 of 3 the iteration before, and the run shown is the one that passed. In iteration 4 he followed it in all 3.',
  },
  'it-printer-paper-jam': {
    title: 'A how-to question',
    caption:
      'Before, he proposed a ticket for a question he could simply answer. After an instruction change, a how-to question gets an answer, not a ticket.',
  },
  'unsupported-close-77': {
    title: 'A regression the eval caught',
    caption:
      'The fix for the email case made him treat closing a ticket as work to file: he tried to file "Close ticket 77", and triage held it. The eval caught it in the same run, and one more instruction restored a plain no.',
  },
}

/** Why planned runs went ungraded, in the page's words. */
export const MISSING_REASON: Record<EvalMissing['reason'], string> = {
  quota: 'the free daily Workers AI allowance ran out',
  other: 'the run stopped early',
}

/** "94.7%", or an em dash when nothing was graded. */
export function percent({ passed, graded }: { passed: number; graded: number }): string {
  return graded === 0 ? '—' : `${((passed / graded) * 100).toFixed(1)}%`
}

/** "Oct 10", the day a run started. */
export function runDate(run: { startedAt: string }): string {
  return new Date(run.startedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

/*
 * The results chart (docs/design/eval-chart.md). It plots the share of graded
 * results that failed, from 0, so an area is honest: pass rates sit near the
 * top and would read as flat. One line per answer key, never joined: a run
 * regraded with a newer key keeps its startedAt, which is where two lines meet.
 */

export interface ChartSeries {
  id: string
  label: string
  /** The newest key leads; older keys are context. */
  emphasis: boolean
  /** Ink for the lead, ink-3 dashed for context. No chart hue: the accent has
   *  five jobs and data is not one of them. */
  color: string
  dash?: string
}

export interface ChartPoint {
  failed: number
  graded: number
  ungraded: number
  /** Percent failed, 0 to 100. */
  rate: number
  missing?: EvalMissing
}

export interface ChartRow {
  startedAt: string
  label: string
  /** The label as it fits a 320px axis: "iter 3". */
  short: string
  date: string
  commit: string
  /** Set when this run is incomplete under any key. */
  missing?: EvalMissing
  /** By series id. Undefined where that key has no graded run. */
  points: Record<string, ChartPoint | undefined>
}

/** Every answer key the export graded with, oldest first. Each is its own
 *  table and its own line on the chart. */
export const ANSWER_KEYS: Array<{ id: string; title: string; runs: EvalRun[]; method: EvalMethod }> = [
  { id: 'earlier', title: 'Eval results by run', runs: EVALS.runs, method: EVALS.method },
  ...(EVALS.comparisons ?? []).map((comparison) => ({
    id: comparison.id,
    title: comparison.title,
    runs: comparison.runs,
    method: comparison.method,
  })),
]

export const CHART_SERIES: ChartSeries[] = ANSWER_KEYS.map((key, index) => {
  const newest = index === ANSWER_KEYS.length - 1
  return {
    id: key.id,
    label:
      ANSWER_KEYS.length === 1
        ? 'answer key'
        : newest
          ? 'current answer key'
          : ANSWER_KEYS.length === 2
            ? 'earlier answer key'
            : `earlier answer key ${index + 1}`,
    emphasis: newest,
    color: newest ? 'var(--ink)' : 'var(--ink-3)',
    dash: newest ? undefined : '4 3',
  }
})

function chartPoint(run: EvalRun, metricId: string): ChartPoint | undefined {
  const tally = run.metrics[metricId]
  if (!tally || tally.graded === 0) return undefined
  const failed = tally.graded - tally.passed
  return {
    failed,
    graded: tally.graded,
    ungraded: tally.ungraded,
    rate: (failed / tally.graded) * 100,
    missing: run.missing,
  }
}

/** Every run under every key, one row per startedAt, oldest first. */
export function chartRows(metricId: string): ChartRow[] {
  const rows = new Map<string, ChartRow>()
  for (const key of ANSWER_KEYS) {
    for (const run of key.runs) {
      const row = rows.get(run.startedAt) ?? {
        startedAt: run.startedAt,
        label: run.label,
        short: run.label.replace(/^iteration /, 'iter '),
        date: runDate(run),
        commit: run.commit,
        points: {},
      }
      row.points[key.id] = chartPoint(run, metricId)
      row.missing ??= run.missing
      rows.set(run.startedAt, row)
    }
  }
  return [...rows.values()].sort((a, b) => a.startedAt.localeCompare(b.startedAt))
}

/** A metric earns a chart when some key has two graded runs of it and
 *  something failed it. Otherwise the line would say nothing the table
 *  doesn't, so only the table has it. */
function chartable(metricId: string): 'yes' | 'never-failed' | 'one-run' {
  const rows = chartRows(metricId)
  const points = rows.flatMap((row) => Object.values(row.points).filter((point) => point !== undefined))
  if (!points.some((point) => point.failed > 0)) return 'never-failed'
  const twoRuns = ANSWER_KEYS.some((key) => rows.filter((row) => row.points[key.id]).length >= 2)
  return twoRuns ? 'yes' : 'one-run'
}

const NEWEST_METRICS = ANSWER_KEYS[ANSWER_KEYS.length - 1].method.metrics

/** The metrics the chart offers, in the newest key's order. */
export const CHART_METRICS = NEWEST_METRICS.filter((metric) => chartable(metric.id) === 'yes')

/** The metrics left to the table, grouped by why. */
export const CHART_LEFT_OUT = {
  neverFailed: NEWEST_METRICS.filter((metric) => chartable(metric.id) === 'never-failed'),
  oneRun: NEWEST_METRICS.filter((metric) => chartable(metric.id) === 'one-run'),
}

/** The top of the y axis: the highest share failed on any metric the chart
 *  offers, rounded up to 5, so switching metrics never rescales it. */
export const CHART_MAX = Math.max(
  5,
  ...CHART_METRICS.flatMap((metric) =>
    chartRows(metric.id).flatMap((row) =>
      Object.values(row.points).map((point) => Math.ceil((point?.rate ?? 0) / 5) * 5),
    ),
  ),
)

/** "4.5%". */
export function failedPercent(point: ChartPoint): string {
  return `${point.rate.toFixed(1)}%`
}

/** The chart in one sentence per key, for a screen reader. */
export function chartSummary(metricId: string): string {
  const metric = NEWEST_METRICS.find((item) => item.id === metricId)
  const rows = chartRows(metricId)
  const lines = CHART_SERIES.map((series) => {
    const values = rows.flatMap((row) => {
      const point = row.points[series.id]
      if (!point) return []
      const short = point.missing ? `, incomplete with ${point.missing.runs} runs missing` : ''
      return [`${failedPercent(point)} at ${row.label}${short}`]
    })
    return values.length > 0 ? `${sentenceCase(series.label)}: ${values.join(', ')}.` : ''
  })
  return [`${metric?.label ?? metricId}. Share that failed, by run.`, ...lines].filter(Boolean).join(' ')
}

/** "earlier answer key" → "Earlier answer key". */
export function sentenceCase(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}
