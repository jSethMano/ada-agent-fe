/**
 * Wire types for the Chak Worker.
 *
 * Source of truth: ada-agent/src/index.ts, `Chak.onRequest`.
 * Endpoint: POST /agents/chak/{instance}   body: { question }
 * (The Worker still rewrites the pre-rename /agents/ada/ prefix for one release.)
 *
 * The router loop returns one of three shapes:
 *   200  { answer, iterations, trace }        normal turn
 *   400  { error }                            missing question
 *   500  { error, trace }                     loop exceeded MAX_ITERATIONS (5)
 *
 * The 500 case still carries a trace, which is worth rendering: a turn that ran
 * out of iterations is the most interesting thing an agent can show you.
 */

/** One tool invocation as recorded by the router. `result` is the raw sub-agent
 *  envelope, which today is `{ result: ... }` from ItAgent.onRequest. */
export interface TraceEntry {
  tool: string
  args: Record<string, unknown>
  result: unknown
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
}
