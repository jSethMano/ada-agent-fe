import { AdaError, type AskErrorBody, type AskResponse, type TraceEntry } from './types'

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
  return `/agents/ada/${instance}`
}

function isTraceArray(value: unknown): value is TraceEntry[] {
  return (
    Array.isArray(value) &&
    value.every(
      (entry) =>
        typeof entry === 'object' && entry !== null && typeof (entry as TraceEntry).tool === 'string',
    )
  )
}

export async function ask(
  instance: string,
  question: string,
  signal?: AbortSignal,
): Promise<AskResponse> {
  const url = `${API_BASE_URL}${instancePath(instance)}`

  let response: Response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
      signal,
    })
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') throw cause
    throw new AdaError(
      `Could not reach the Ada Worker at ${url || 'this origin'}. Is \`npm run dev\` running in ada-agent?`,
      0,
    )
  }

  const body: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    const failure = (body ?? {}) as AskErrorBody

    // A dead upstream reaches us as a bare gateway error from the Vite proxy
    // (or from Cloudflare in production), with no JSON body to explain itself.
    const gatewayDown = !failure.error && [502, 503, 504].includes(response.status)

    throw new AdaError(
      gatewayDown
        ? `The Ada Worker is not responding (${response.status}). Start it with \`npm run dev\` in the ada-agent repo.`
        : (failure.error ?? `Worker responded ${response.status}.`),
      response.status,
      isTraceArray(failure.trace) ? failure.trace : [],
    )
  }

  const ok = body as Partial<AskResponse> | null
  if (!ok || typeof ok.answer !== 'string') {
    throw new AdaError('Worker returned a body without an `answer` field.', response.status)
  }

  return {
    answer: ok.answer,
    iterations: typeof ok.iterations === 'number' ? ok.iterations : 1,
    trace: isTraceArray(ok.trace) ? ok.trace : [],
  }
}
