import { AGENT } from '@/lib/site'
import {
  ChakError,
  type ApprovalDecision,
  type AskErrorBody,
  type AskResponse,
  type PendingApproval,
  type TraceEntry,
} from './types'

/**
 * Base URL for the Worker.
 *
 * Unset (the default) means same-origin, which in dev goes through the Vite
 * proxy defined in vite.config.ts. That keeps local development working without
 * touching the Worker, which does not send CORS headers today.
 *
 * Set VITE_API_BASE_URL to hit the Worker directly (e.g. the deployed
 * workers.dev URL). That path requires CORS on the Worker side.
 */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

/** The Durable Object address for a session. Shown verbatim in the console
 *  header, because the path segment *is* the memory boundary. */
export function instancePath(instance: string): string {
  return `/agents/${AGENT.slug}/${instance}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isTraceEntry(entry: unknown): entry is TraceEntry {
  if (!isRecord(entry)) return false
  if (entry.kind === 'check') {
    return (
      typeof entry.check === 'string' &&
      typeof entry.ms === 'number' &&
      Array.isArray(entry.answers) &&
      entry.answers.every(
        (answer) => isRecord(answer) && typeof answer.id === 'string' && typeof answer.type === 'string',
      )
    )
  }
  if (entry.kind === 'approval') {
    return (
      typeof entry.tool === 'string' &&
      typeof entry.decision === 'string' &&
      typeof entry.ms === 'number' &&
      isRecord(entry.proposed)
    )
  }
  // No `kind` is how the Worker sent tool calls before checks existed.
  return (entry.kind === undefined || entry.kind === 'tool') && typeof entry.tool === 'string'
}

function isPendingApproval(value: unknown): value is PendingApproval {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.tool === 'string' &&
    isRecord(value.args) &&
    typeof value.args.title === 'string' &&
    typeof value.args.description === 'string'
  )
}

/** Keeps the rows that match a known shape and drops the rest one at a time,
 *  so a single unrecognized row cannot hide every other row in the turn. */
function normalizeTrace(value: unknown): TraceEntry[] {
  return Array.isArray(value) ? value.filter(isTraceEntry) : []
}

/** Sends a new message. */
export function ask(instance: string, question: string, signal?: AbortSignal): Promise<AskResponse> {
  return post(instance, { question }, signal)
}

/** Sends the visitor's decision on a waiting ticket, which resumes the turn. */
export function decide(
  instance: string,
  decision: ApprovalDecision,
  signal?: AbortSignal,
): Promise<AskResponse> {
  return post(instance, { decision }, signal)
}

async function post(
  instance: string,
  body: { question: string } | { decision: ApprovalDecision },
  signal?: AbortSignal,
): Promise<AskResponse> {
  const url = `${API_BASE_URL}${instancePath(instance)}`

  let response: Response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    })
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') throw cause
    throw new ChakError(
      `Could not reach ${AGENT.name} at ${url || 'this origin'}. Is \`npm run dev\` running in ada-agent?`,
      0,
    )
  }

  const payload: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    const failure = (payload ?? {}) as AskErrorBody

    // A dead upstream reaches us as a bare gateway error from the Vite proxy
    // (or from Cloudflare in production), with no JSON body to explain itself.
    const gatewayDown = !failure.error && [502, 503, 504].includes(response.status)

    throw new ChakError(
      gatewayDown
        ? `${AGENT.name} is offline: the Worker is not responding (${response.status}). Start it with \`npm run dev\` in the ada-agent repo.`
        : (failure.error ?? `Worker responded ${response.status}.`),
      response.status,
      normalizeTrace(failure.trace),
    )
  }

  const ok = isRecord(payload) ? payload : null
  const iterations = typeof ok?.iterations === 'number' ? ok.iterations : 1
  const trace = normalizeTrace(ok?.trace)

  if (ok && isPendingApproval(ok.approval)) {
    return { kind: 'awaiting', approval: ok.approval, iterations, trace }
  }
  if (!ok || typeof ok.answer !== 'string') {
    throw new ChakError('Worker returned a body without an `answer` field.', response.status)
  }
  return { kind: 'answered', answer: ok.answer, iterations, trace }
}
