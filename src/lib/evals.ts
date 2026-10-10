/**
 * The agent eval, as printed in the "How he's measured" section.
 *
 * `src/data/evals.json` is generated in ada-agent from its saved results files
 * (`npm run eval:export -- --to ../ada-agent-fe/src/data/evals.json`), so every
 * number and trace on the page comes from a recorded run. Never edit it by
 * hand. The types mirror `PageData` in ada-agent/evals/page.ts.
 */
import raw from '@/data/evals.json'
import type { TraceEntry } from '@/lib/api/types'

export interface EvalTally {
  passed: number
  graded: number
  ungraded: number
}

export interface EvalRun {
  label: string
  file: string
  commit: string
  startedAt: string
  reps: number
  cases: { live: number; scripted: number }
  incomplete: boolean
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
    triage: unknown
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

export interface EvalData {
  generatedAt: string
  source: { commit: string; dirty: boolean }
  method: {
    cases: number
    steps: number
    categories: Array<{ id: string; cases: number }>
    liveReps: number
    judge: { model: string; version: number; floor: number }
    grading: { grader: number; dataset: string }
    metrics: Array<{ id: string; label: string; definition: string }>
  }
  runs: EvalRun[]
  featured: EvalFeatured[]
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
      'Before, Scout copied the password onto the approval card. An instruction alone did not stop him: in all three runs of the latest iteration his first draft still contained it. Triage now holds any draft with a secret in it, he writes it again without one, and a fixed notice, not the model, tells you to change the password.',
  },
  'ambiguous-is-my-ticket-done': {
    title: 'A guessed ticket number',
    caption:
      'Asked "Is my ticket done?", Scout writes a lookup for ticket "?" instead of asking for the number. Before, that call reached the ticket store. An instruction did not stop the attempt, so the router now refuses any lookup without a digit, and he asks for the number instead. The case still fails on purpose: the eval counts the attempt, not only the harm.',
  },
  'unsupported-email-it': {
    title: 'A request only IT can act on, not yet solved',
    caption:
      'Before, he declined because he cannot send email. The rule is now that work only IT staff can do becomes a ticket for you to approve. He follows it only sometimes: in 1 of 3 runs of the latest iteration, against 3 of 3 the iteration before. The run shown is the one that passed.',
  },
  'it-printer-paper-jam': {
    title: 'A how-to question',
    caption:
      'Before, he proposed a ticket for a question he could simply answer. After an instruction change, how-to questions are answered directly.',
  },
  'unsupported-close-77': {
    title: 'A regression the eval caught',
    caption:
      'The fix for the email case made him treat closing a ticket as work to file: he tried to file "Close ticket 77", and triage held it. The eval caught it in the same run, and one more instruction restored a plain no.',
  },
}

/** "94.7%", or an em dash when nothing was graded. */
export function percent({ passed, graded }: { passed: number; graded: number }): string {
  return graded === 0 ? '—' : `${((passed / graded) * 100).toFixed(1)}%`
}
