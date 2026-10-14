import { ArrowClockwiseIcon } from '@phosphor-icons/react'
import { ChakSprite } from '@/components/chak-sprite'
import type { Pose } from '@/components/chak-sprite-frames'
import { Bubble, BubbleContent, BubbleTail } from '@/components/ui/bubble'
import { Button } from '@/components/ui/button'
import { SITE } from '@/lib/site'
import { Answer } from './answer'
import { ApprovalCard } from './approval-card'
import { ArticleSources } from './article-sources'
import { Notice } from './notice'
import { Trace } from './trace'
import type { ApprovalDecision, Turn } from '@/lib/api/types'

/** The visitor's message, on the right in the ink bubble. Also used by the
 *  eval replays, so a recorded run reads like the live thread. */
export function VisitorMessage({ children }: { children: React.ReactNode }) {
  return (
    <Bubble align="end" className="max-w-[min(85%,68ch)]">
      <BubbleTail />
      <BubbleContent className="px-3.5 py-2 text-[15px] leading-relaxed">
        <span className="sr-only">You: </span>
        {children}
      </BubbleContent>
    </Bubble>
  )
}

interface ChakReplyProps {
  /** In flight: the sprite loops its thinking frames. */
  thinking?: boolean
  pose?: Pose
  /** A machine word beside his name while there is nothing else to show. */
  note?: string
  children?: React.ReactNode
}

/** Chak's half of a turn, on the left: his sprite with his name beside it, then
 *  the record (trace, approval card) at full width, because traces need the
 *  room, then his answer in its bubble. Only prose goes in a bubble. */
export function ChakReply({ thinking, pose, note, children }: ChakReplyProps) {
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-2 text-[12px] tracking-wide text-ink-3 select-none">
        <ChakSprite size={16} thinking={thinking} pose={pose} />
        chak
        {note && <span>· {note}</span>}
      </p>
      {children}
    </div>
  )
}

interface TurnViewProps {
  turn: Turn
  onRetry: (id: string) => void
  onDecide: (id: string, decision: Omit<ApprovalDecision, 'id'>) => void
  /** The decision in flight for this turn, if any. */
  deciding: ApprovalDecision['action'] | null
  /** A request is in flight, for this turn or another. */
  busy: boolean
}

export function TurnView({ turn, onRetry, onDecide, deciding, busy }: TurnViewProps) {
  const failedWithTrace = turn.status === 'failed' && (turn.trace?.length ?? 0) > 0
  // A 502 carries a trace too (the guard row is recorded even when the model
  // call throws), so only the 500 means the loop ran out of passes. Turns saved
  // before errorStatus existed could only have had a trace on the 500 path.
  const overran = failedWithTrace && turn.errorStatus !== 502

  return (
    // Turns are set apart by space, not rules: the bubbles already mark where
    // each one starts.
    <article className="flex scroll-mb-36 flex-col gap-3 px-4 py-4 sm:px-6">
      <VisitorMessage>{turn.question}</VisitorMessage>

      <ChakReply
        thinking={turn.status === 'pending'}
        pose={turn.status === 'failed' ? 'ears-back' : undefined}
        note={turn.status === 'pending' ? 'routing' : undefined}
      >
        {turn.status === 'pending' && (
          <span role="status" className="sr-only">
            Chak is working on your question.
          </span>
        )}

        {/* The loop paused on a ticket. The trace so far stays in place, and the
            decision resumes this same row, so nothing jumps when it comes back. */}
        {turn.status === 'awaiting' && turn.approval && (
          <>
            <Trace
              trace={turn.trace ?? []}
              iterations={turn.iterations}
              elapsedMs={turn.elapsedMs}
              approval={turn.approvalClosed ? 'closed' : 'waiting'}
            />
            <ApprovalCard
              // Remounts for a second ticket in the same turn, so no edit carries over.
              key={turn.approval.id}
              turn={{ ...turn, approval: turn.approval }}
              deciding={deciding}
              busy={busy}
              onDecide={(decision) => onDecide(turn.id, decision)}
            />
          </>
        )}

        {turn.status === 'answered' && (
          <>
            <Trace
              trace={turn.trace ?? []}
              iterations={turn.iterations}
              elapsedMs={turn.elapsedMs}
            />
            {/* Chak's prose is in his bubble; everything the machine emits is
                mono and stays outside it, so the bubble only ever holds what he
                said. */}
            <Answer text={turn.answer ?? ''} />
            <ArticleSources trace={turn.trace ?? []} answer={turn.answer ?? ''} />
            {turn.notice && <Notice text={turn.notice} />}
          </>
        )}

        {turn.status === 'failed' && (
          <>
            {failedWithTrace && (
              <Trace
                trace={turn.trace ?? []}
                elapsedMs={turn.elapsedMs}
                failed
              />
            )}
            <div className="mt-3 rounded-xl bg-danger-wash px-3.5 py-3">
              {/* His ears go back in the sprite above, so the box needs no sprite of its own. */}
              <div className="text-[13.5px] leading-relaxed text-danger">
                {/* The plain-English line is ours; the Worker's own error stays
                    underneath, verbatim, because the record is never rewritten. */}
                {overran && (
                  <p>
                    Chak stopped after {SITE.maxIterations} passes without settling on an answer.
                    Everything he tried is above.
                  </p>
                )}
                <p className={overran ? 'mt-1 text-[12.5px]' : undefined}>{turn.error}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onRetry(turn.id)}
                className="mt-2.5 text-[12.5px]"
              >
                <ArrowClockwiseIcon aria-hidden weight="bold" />
                Retry this question
              </Button>
            </div>
          </>
        )}
      </ChakReply>
    </article>
  )
}
