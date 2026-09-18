import { useCallback, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { ask } from '@/lib/api/client'
import { AdaError, type Turn } from '@/lib/api/types'

let turnCounter = 0
const nextTurnId = () => `turn-${++turnCounter}`

/**
 * Owns the transcript for one session.
 *
 * The turn is appended as `pending` the moment it is submitted, so the thread
 * never jumps: the row that shows the in-flight indicator is the same row that
 * later shows the answer. TanStack Query handles the request lifecycle; the
 * transcript itself is local state because it is ordered, append-only, and
 * scoped to this mount. The authoritative history lives in the Durable Object.
 */
export function useAsk(instance: string) {
  const [turns, setTurns] = useState<Turn[]>([])

  const patchTurn = useCallback((id: string, patch: Partial<Turn>) => {
    setTurns((prev) => prev.map((turn) => (turn.id === id ? { ...turn, ...patch } : turn)))
  }, [])

  const mutation = useMutation({
    mutationKey: ['ada', 'ask', instance],
    mutationFn: async ({ question, turnId }: { question: string; turnId: string }) => {
      const startedAt = performance.now()
      try {
        const response = await ask(instance, question)
        return { response, turnId, elapsedMs: Math.round(performance.now() - startedAt) }
      } catch (cause) {
        if (cause instanceof AdaError) {
          // Re-throw with the measured time attached so a failed turn still
          // reports honestly how long it ran before giving up.
          Object.assign(cause, { elapsedMs: Math.round(performance.now() - startedAt) })
        }
        throw cause
      }
    },
    onSuccess: ({ response, turnId, elapsedMs }) => {
      patchTurn(turnId, {
        status: 'answered',
        answer: response.answer,
        iterations: response.iterations,
        trace: response.trace,
        elapsedMs,
      })
    },
    onError: (error: unknown, variables) => {
      const adaError = error instanceof AdaError ? error : null
      patchTurn(variables.turnId, {
        status: 'failed',
        error: adaError?.message ?? (error instanceof Error ? error.message : 'Unknown failure.'),
        // The 500 "exceeded max iterations" path still returns a trace.
        trace: adaError?.trace ?? [],
        elapsedMs: (adaError as (AdaError & { elapsedMs?: number }) | null)?.elapsedMs,
      })
    },
  })

  const submit = useCallback(
    (raw: string) => {
      const question = raw.trim()
      if (!question || mutation.isPending) return

      const turnId = nextTurnId()
      setTurns((prev) => [...prev, { id: turnId, question, status: 'pending' }])
      mutation.mutate({ question, turnId })
    },
    [mutation],
  )

  const retry = useCallback(
    (turnId: string) => {
      const target = turns.find((turn) => turn.id === turnId)
      if (!target || mutation.isPending) return
      patchTurn(turnId, { status: 'pending', error: undefined, trace: undefined, elapsedMs: undefined })
      mutation.mutate({ question: target.question, turnId })
    },
    [turns, mutation, patchTurn],
  )

  const clear = useCallback(() => setTurns([]), [])

  return { turns, submit, retry, clear, isPending: mutation.isPending }
}
