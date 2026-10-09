/**
 * Wire types for the Chak Worker.
 *
 * Source of truth: ada-agent/src/index.ts, `Chak.onRequest`, and the trace
 * shapes in ada-agent/src/trace.ts.
 * Endpoint: POST /agents/chak/{instance}
 *   body: { question }                          a new message
 *   body: { decision: { id, action, args? } }   the visitor's answer to a waiting ticket
 * (The Worker still rewrites the pre-rename /agents/ada/ prefix for one release.)
 *
 * The router loop returns one of these shapes:
 *   200  { answer, iterations, trace }        normal turn, or one the input guard
 *                                             blocked (iterations 0, fixed answer),
 *                                             or one whose answer was replaced
 *                                             (fixed answer, full trace)
 *   200  { approval, iterations, trace }      the turn paused: a ticket is waiting
 *                                             for the visitor's approval
 *   400  { error }                            missing question, or a malformed decision
 *   409  { error }                            a decision for a ticket no longer waiting
 *   500  { error, trace }                     loop exceeded MAX_ITERATIONS (5)
 *   502  { error, trace }                     the model call threw mid-turn (a dropped
 *                                             connection is retried once first)
 *
 * A ticket system that can't be reached is not a failure: the turn answers
 * (200), and the call's tool row carries an `error` in its result.
 *
 * Both failures still carry a trace, which is worth rendering: a turn that ran
 * out of iterations is the most interesting thing an agent can show you.
 */

/** One row of the trace, in the order it started: a tool call the router made,
 *  a Jev check, or the visitor's decision on a ticket. `input_guard` runs before
 *  the loop. `triage_ticket` runs just before each create_ticket, so it sits
 *  above that row, with the visitor's decision between them. `verify_answer`
 *  runs after the loop on answered turns, so it is always the last row. */
export type TraceEntry = ToolCallEntry | CheckEntry | ApprovalEntry

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
  /** The model wrote this call into its reply as text instead of making it,
   *  and the Worker parsed it out and ran it. */
  fromText?: boolean
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
  /** Set when the Worker acted on the answers. `blocked`: the input guard
   *  refused the turn and the model never ran. `replaced`: the answer check found
   *  the model's answer leaking its instructions, and the visitor got fixed text.
   *  `held`: triage found no problem the visitor had described, so the ticket was
   *  not filed and the model was told to ask what is wrong. */
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

/** The visitor's decision on a call that waited for approval. Rendered as
 *  `human.approval`. `ms` is how long the call waited for the decision. */
export interface ApprovalEntry {
  kind: 'approval'
  tool: string
  /** `approved` or `cancelled`. A string so a new outcome still renders. */
  decision: string
  /** The arguments the model proposed. */
  proposed: Record<string, unknown>
  /** Fields the visitor changed before approving, with their new values. */
  edits?: Record<string, string>
  ms: number
}

export function isCheck(entry: TraceEntry): entry is CheckEntry {
  return entry.kind === 'check'
}

export function isApproval(entry: TraceEntry): entry is ApprovalEntry {
  return entry.kind === 'approval'
}

export function isToolCall(entry: TraceEntry): entry is ToolCallEntry {
  return entry.kind === undefined || entry.kind === 'tool'
}

/** A ticket the model wants to file, waiting for the visitor. Triage has already
 *  run on it, so the card can show its priority and any linked ticket. */
export interface PendingApproval {
  id: string
  tool: string
  args: { title: string; description: string }
  /** Null when triage did not run. */
  priority: string | null
  triage?: {
    triaged: boolean
    category?: string
    security_incident?: boolean
    duplicate_of?: string | null
    related_to?: string | null
  }
}

/** What the visitor sends back for a waiting ticket. `args` carries their edits. */
export interface ApprovalDecision {
  id: string
  action: 'approve' | 'cancel'
  args?: { title: string; description: string }
}

export type AskResponse =
  | { kind: 'answered'; answer: string; iterations: number; trace: TraceEntry[] }
  | { kind: 'awaiting'; approval: PendingApproval; iterations: number; trace: TraceEntry[] }

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

/** `awaiting`: the turn paused on a ticket that needs the visitor's approval. */
export type TurnStatus = 'pending' | 'awaiting' | 'answered' | 'failed'

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
  /** The ticket an `awaiting` turn is waiting on. */
  approval?: PendingApproval
  /** Set once the card can no longer be acted on, and why. `dropped`: the
   *  visitor sent a new message instead of deciding. `stale`: the Worker no
   *  longer had the ticket waiting (409). The turn stays `awaiting` so the card
   *  can say what happened. */
  approvalClosed?: 'dropped' | 'stale'
  /** Why the last decision did not go through when trying again can work, such
   *  as a rate limit or a dropped connection. */
  approvalError?: string
}
