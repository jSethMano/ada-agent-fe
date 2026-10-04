/**
 * Wire types for the Chak Worker.
 *
 * Source of truth: ada-agent/src/index.ts, `Chak.onRequest`, and the trace
 * shapes in ada-agent/src/trace.ts.
 * Endpoint: POST /agents/chak/{instance}   body: { question }
 * (The Worker still rewrites the pre-rename /agents/ada/ prefix for one release.)
 *
 * The router loop returns one of four shapes:
 *   200  { answer, iterations, trace }        normal turn, or one the input guard
 *                                             blocked (iterations 0, fixed answer)
 *   400  { error }                            missing question
 *   500  { error, trace }                     loop exceeded MAX_ITERATIONS (5)
 *   502  { error, trace }                     a model or sub-agent call threw mid-turn
 *
 * Both failures still carry a trace, which is worth rendering: a turn that ran
 * out of iterations is the most interesting thing an agent can show you.
 */

/** One row of the trace, in the order it started: a tool call the router made,
 *  or a Jev check the Worker ran before the loop. */
export type TraceEntry = ToolCallEntry | CheckEntry

/** One tool invocation as recorded by the router. `result` is the raw sub-agent
 *  envelope, which today is `{ result: ... }` from ItAgent.onRequest. */
export interface ToolCallEntry {
  /** The Worker always sends it. Optional because turns saved in localStorage
   *  before checks existed have no `kind`, and a missing kind is a tool call. */
  kind?: 'tool'
  tool: string
  args: Record<string, unknown>
  result: unknown
  /** Sub-agent dispatch time. Absent on older turns. */
  ms?: number
}

/** A Jev (TypeSafe System One) check. It records typed answers and
 *  probabilities; it only changes what the router does where the Worker has a
 *  rule for that, and then says so in `action`. */
export interface CheckEntry {
  kind: 'check'
  /** Rendered as `jev.<check>`. A string rather than a union so a check the
   *  Worker adds later renders without a front-end release. */
  check: string
  status: 'ok' | 'skipped' | 'error'
  /** Why there are no answers, e.g. `no_api_key` or `timeout`. */
  reason?: string
  /** Set when the Worker acted on the answers. Today only `blocked`: the input
   *  guard refused the turn and the model never ran. */
  action?: string
  /** The versioned model that answered, e.g. `jev-1.13.0`. */
  model?: string
  ms: number
  inputTokens?: number
  /** In question order. Empty unless status is 'ok'. */
  answers: CheckAnswer[]
}

/** `flagged` is decided by the Worker, next to the question it belongs to. It is
 *  a display rule, not a calibrated threshold, and nothing acts on it. */
export type CheckAnswer =
  | { id: string; type: 'noul'; value: number; flagged: boolean }
  | {
      id: string
      type: 'choice'
      value: string
      confidence: number
      probabilities: Record<string, number>
      flagged: boolean
    }
  | {
      id: string
      type: 'score'
      value: number
      confidence: number
      probabilities: Record<string, number>
      flagged: boolean
    }

export function isCheck(entry: TraceEntry): entry is CheckEntry {
  return entry.kind === 'check'
}

export interface AskResponse {
  answer: string
  iterations: number
  trace: TraceEntry[]
}

export interface AskErrorBody {
  error: string
  trace?: TraceEntry[]
}

/** Thrown for any non-2xx response, or a transport failure. Carries the partial
 *  trace when the Worker supplied one so the UI can still show the work. */
export class ChakError extends Error {
  readonly status: number
  readonly trace: TraceEntry[]

  constructor(message: string, status: number, trace: TraceEntry[] = []) {
    super(message)
    this.name = 'ChakError'
    this.status = status
    this.trace = trace
  }
}

export type TurnStatus = 'pending' | 'answered' | 'failed'

/** A rendered exchange. Held client-side; the Durable Object holds the
 *  authoritative history keyed by instance id. */
export interface Turn {
  id: string
  question: string
  status: TurnStatus
  answer?: string
  iterations?: number
  trace?: TraceEntry[]
  /** Measured client-side roundtrip in ms. Real, not decorative. */
  elapsedMs?: number
  error?: string
  /** HTTP status of a failed turn. A 500 and a 502 both carry a trace, and only
   *  the 500 means the loop ran out of passes. */
  errorStatus?: number
}
