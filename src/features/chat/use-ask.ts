import { useCallback, type Dispatch, type SetStateAction } from 'react'
import { useMutation } from '@tanstack/react-query'
import { ask } from '@/lib/api/client'
import { AdaError, type Turn } from '@/lib/api/types'

const nextTurnId = () => `turn-${crypto.randomUUID()}`

/**
 * Drives one conversation's request lifecycle.
 *
 * The turn is appended as `pending` the moment it is submitted, so the thread
 * never jumps: the row that shows the in-flight indicator is the same row that
 * later shows the answer.
 *
 * Turns are passed in rather than held here, because they outlive this hook:
 * useConversations owns them so they survive a reload and a conversation
 * switch. Ada's own memory lives in the Durable Object keyed by `instance`.
 */
export function useAsk(
  instance: string,
  turns: Turn[],
  setTurns: Dispatch<SetStateAction<Turn[]>>,
) {
  const patchTurn = useCallback(
    (id: string, patch: Partial<Turn>) => {
      setTurns((prev) => prev.map((turn) => (turn.id === id ? { ...turn, ...patch } : turn)))
    },
    [setTurns],
  )

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
    [mutation, setTurns],
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


  return { submit, retry, isPending: mutation.isPending }
}
