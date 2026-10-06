import { useCallback, type Dispatch, type SetStateAction } from 'react'
import { useMutation } from '@tanstack/react-query'
import { ask, decide } from '@/lib/api/client'
import { ChakError, type ApprovalDecision, type Turn } from '@/lib/api/types'

const nextTurnId = () => `turn-${crypto.randomUUID()}`

/** A new message, or the visitor's decision on the ticket a turn is waiting on.
 *  A decision continues the same turn, so its roundtrip adds to the time the
 *  turn already took (`elapsedBefore`); the time spent deciding does not count. */
type TurnRequest =
  | { turnId: string; question: string }
  | { turnId: string; decision: ApprovalDecision; elapsedBefore: number }

/**
 * Drives one conversation's request lifecycle.
 *
 * The turn is appended as `pending` the moment it is submitted, so the thread
 * never jumps: the row that shows the in-flight indicator is the same row that
 * later shows the answer. A turn that pauses on a ticket becomes `awaiting`, and
 * the visitor's decision resumes that same row rather than starting a new one.
 *
 * Turns are passed in rather than held here, because they outlive this hook:
 * useConversations owns them so they survive a reload and a conversation
 * switch. Chak's own memory lives in the Durable Object keyed by `instance`.
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
    mutationKey: ['chak', 'ask', instance],
    mutationFn: async (request: TurnRequest) => {
      const startedAt = performance.now()
      const elapsedBefore = 'decision' in request ? request.elapsedBefore : 0
      try {
        const response =
          'decision' in request
            ? await decide(instance, request.decision)
            : await ask(instance, request.question)
        return { response, elapsedMs: elapsedBefore + Math.round(performance.now() - startedAt) }
      } catch (cause) {
        if (cause instanceof ChakError) {
          // Re-throw with the measured time attached so a failed turn still
          // reports honestly how long it ran before giving up.
          Object.assign(cause, { elapsedMs: elapsedBefore + Math.round(performance.now() - startedAt) })
        }
        throw cause
      }
    },
    onSuccess: ({ response, elapsedMs }, request) => {
      const shared = { iterations: response.iterations, trace: response.trace, elapsedMs, approvalError: undefined }
      if (response.kind === 'awaiting') {
        patchTurn(request.turnId, { ...shared, status: 'awaiting', approval: response.approval, approvalClosed: undefined })
      } else {
        patchTurn(request.turnId, { ...shared, status: 'answered', answer: response.answer, approval: undefined })
      }
    },
    onError: (error: unknown, request) => {
      const chakError = error instanceof ChakError ? error : null
      const message = chakError?.message ?? (error instanceof Error ? error.message : 'Unknown failure.')

      // A decision that never reached the loop leaves the turn waiting, with the
      // reason on the card. One that failed inside the resumed loop carries its
      // trace and fails the turn like any other.
      if ('decision' in request && !chakError?.trace.length) {
        patchTurn(
          request.turnId,
          chakError?.status === 409
            ? { approvalClosed: 'stale', approvalError: undefined }
            : { approvalError: message },
        )
        return
      }

      patchTurn(request.turnId, {
        status: 'failed',
        error: message,
        // The 500 (out of passes) and 502 (a call threw) paths still return a trace.
        trace: chakError?.trace ?? [],
        errorStatus: chakError?.status,
        elapsedMs: (chakError as (ChakError & { elapsedMs?: number }) | null)?.elapsedMs,
        approval: undefined,
      })
    },
  })

  const submit = useCallback(
    (raw: string) => {
      const question = raw.trim()
      if (!question || mutation.isPending) return

      const turnId = nextTurnId()
      // A new message instead of a decision drops the waiting ticket: the
      // Worker does the same on its side when the message arrives.
      setTurns((prev) => [
        ...prev.map((turn): Turn =>
          turn.status === 'awaiting' && !turn.approvalClosed
            ? { ...turn, approvalClosed: 'dropped', approvalError: undefined }
            : turn,
        ),
        { id: turnId, question, status: 'pending' },
      ])
      mutation.mutate({ question, turnId })
    },
    [mutation, setTurns],
  )

  const decideOn = useCallback(
    (turnId: string, decision: Omit<ApprovalDecision, 'id'>) => {
      const target = turns.find((turn) => turn.id === turnId)
      if (!target?.approval || target.approvalClosed || mutation.isPending) return
      patchTurn(turnId, { approvalError: undefined })
      mutation.mutate({
        turnId,
        decision: { ...decision, id: target.approval.id },
        elapsedBefore: target.elapsedMs ?? 0,
      })
    },
    [turns, mutation, patchTurn],
  )

  const retry = useCallback(
    (turnId: string) => {
      const target = turns.find((turn) => turn.id === turnId)
      if (!target || mutation.isPending) return
      patchTurn(turnId, {
        status: 'pending',
        error: undefined,
        errorStatus: undefined,
        trace: undefined,
        elapsedMs: undefined,
      })
      mutation.mutate({ question: target.question, turnId })
    },
    [turns, mutation, patchTurn],
  )

  /** The turn whose decision is in flight, and which one, so its card can say so. */
  const variables = mutation.isPending ? mutation.variables : undefined
  const deciding =
    variables && 'decision' in variables
      ? { turnId: variables.turnId, action: variables.decision.action }
      : null

  return { submit, retry, decide: decideOn, deciding, isPending: mutation.isPending }
}
