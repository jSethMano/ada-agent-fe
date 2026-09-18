import { ArrowClockwiseIcon, WarningIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Answer } from './answer'
import { Trace } from './trace'
import type { Turn } from '@/lib/api/types'

/** The speaker label sits in a fixed mono gutter so the thread reads as a
 *  transcript rather than a stack of chat bubbles. Alternating bubbles are the
 *  single clearest "chatbot playground" signal, and this is a tool. */
function Gutter({ speaker }: { speaker: 'you' | 'ada' }) {
  return (
    <span className="pt-0.5 font-mono text-[11px] tracking-wide text-ink-3 select-none">
      {speaker}
    </span>
  )
}

function Row({ speaker, children }: { speaker: 'you' | 'ada'; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[2.75rem_1fr] gap-x-3 px-4 py-4 sm:grid-cols-[3.5rem_1fr] sm:gap-x-4 sm:px-6">
      <Gutter speaker={speaker} />
      <div className="min-w-0">{children}</div>
    </div>
  )
}

export function TurnView({ turn, onRetry }: { turn: Turn; onRetry: (id: string) => void }) {
  const overran = turn.status === 'failed' && (turn.trace?.length ?? 0) > 0

  return (
    <article className="border-t border-rule first:border-t-0">
      <Row speaker="you">
        <p className="text-[15px] leading-relaxed text-ink">{turn.question}</p>
      </Row>

      <Row speaker="ada">
        {turn.status === 'pending' && (
          <div role="status" className="flex items-center gap-2">
            <span aria-hidden className="ada-tick flex items-center gap-1">
              <span className="size-1 bg-ink-3" />
              <span className="size-1 bg-ink-3" />
              <span className="size-1 bg-ink-3" />
            </span>
            <span className="font-mono text-[11.5px] text-ink-3">routing</span>
            <span className="sr-only">Ada is working on your question.</span>
          </div>
        )}

        {turn.status === 'answered' && (
          <>
            <Trace
              trace={turn.trace ?? []}
              iterations={turn.iterations}
              elapsedMs={turn.elapsedMs}
            />
            {/* Ada's prose is set in the serif; everything the machine emits is
                mono. The typography carries the human/machine boundary so the
                trace needs no coloured container to read as a different thing. */}
            <Answer text={turn.answer ?? ''} />
          </>
        )}

        {turn.status === 'failed' && (
          <>
            {overran && (
              <Trace
                trace={turn.trace ?? []}
                elapsedMs={turn.elapsedMs}
                overran
              />
            )}
            <div className="mt-3 border-l-2 border-danger bg-danger-wash px-3 py-2.5">
              <p className="flex items-start gap-2 text-[13.5px] leading-relaxed text-danger">
                <WarningIcon aria-hidden weight="fill" className="mt-0.5 size-3.5 shrink-0" />
                <span>{turn.error}</span>
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onRetry(turn.id)}
                className="mt-2.5 font-mono text-[11.5px]"
              >
                <ArrowClockwiseIcon aria-hidden weight="bold" />
                Retry this question
              </Button>
            </div>
          </>
        )}
      </Row>
    </article>
  )
}
