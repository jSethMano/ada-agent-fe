import { ArrowClockwiseIcon } from '@phosphor-icons/react'
import { ChakSprite } from '@/components/chak-sprite'
import { Button } from '@/components/ui/button'
import { SITE } from '@/lib/site'
import { Answer } from './answer'
import { Trace } from './trace'
import type { Turn } from '@/lib/api/types'

/** The speaker label sits in a fixed mono gutter so the thread reads as a
 *  transcript rather than a stack of chat bubbles. Alternating bubbles are the
 *  single clearest "chatbot playground" signal, and this is a tool. */
function Gutter({ speaker }: { speaker: 'you' | 'chak' }) {
  return (
    <span className="pt-0.5 font-mono text-[11px] tracking-wide text-ink-3 select-none">
      {speaker}
    </span>
  )
}

function Row({ speaker, children }: { speaker: 'you' | 'chak'; children: React.ReactNode }) {
  return (
    // Below sm the label sits above the message: a side gutter there costs a
    // quarter of the width that traces need.
    <div className="grid grid-cols-1 gap-y-1.5 px-4 py-4 sm:grid-cols-[3.5rem_1fr] sm:gap-x-4 sm:gap-y-0 sm:px-6">
      <Gutter speaker={speaker} />
      <div className="min-w-0">{children}</div>
    </div>
  )
}

export function TurnView({ turn, onRetry }: { turn: Turn; onRetry: (id: string) => void }) {
  const failedWithTrace = turn.status === 'failed' && (turn.trace?.length ?? 0) > 0
  // A 502 carries a trace too (the guard row is recorded even when the model
  // call throws), so only the 500 means the loop ran out of passes. Turns saved
  // before errorStatus existed could only have had a trace on the 500 path.
  const overran = failedWithTrace && turn.errorStatus !== 502

  return (
    <article className="scroll-mb-28 border-t border-rule first:border-t-0">
      <Row speaker="you">
        <p className="max-w-[68ch] text-[15px] leading-relaxed text-ink">{turn.question}</p>
      </Row>

      <Row speaker="chak">
        {turn.status === 'pending' && (
          <div role="status" className="flex items-center gap-2">
            <ChakSprite thinking size={16} />
            <span className="font-mono text-[11.5px] text-ink-3">routing</span>
            <span className="sr-only">Chak is working on your question.</span>
          </div>
        )}

        {turn.status === 'answered' && (
          <>
            <Trace
              trace={turn.trace ?? []}
              iterations={turn.iterations}
              elapsedMs={turn.elapsedMs}
            />
            {/* Chak's prose is set in Geist Pixel; everything the machine emits is
                mono. The typography carries the human/machine boundary so the
                trace needs no coloured container to read as a different thing. */}
            <Answer text={turn.answer ?? ''} />
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
            <div className="mt-3 border-l-2 border-danger bg-danger-wash px-3 py-2.5">
              <div className="flex items-start gap-2">
                <ChakSprite pose="ears-back" size={16} className="mt-0.5" />
                <div className="min-w-0 text-[13.5px] leading-relaxed text-danger">
                  {/* The plain-English line is ours; the Worker's own error stays
                      underneath, verbatim, because the record is never rewritten. */}
                  {overran && (
                    <p>
                      Chak stopped after {SITE.maxIterations} passes without settling on an answer.
                      Everything he tried is above.
                    </p>
                  )}
                  <p className={overran ? 'mt-1 font-mono text-[11.5px]' : undefined}>{turn.error}</p>
                </div>
              </div>
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
