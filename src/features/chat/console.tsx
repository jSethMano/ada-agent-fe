import { useEffect, useRef } from 'react'
import { PlusIcon } from '@phosphor-icons/react'
import { ChakSprite } from '@/components/chak-sprite'
import { Button } from '@/components/ui/button'
import { instancePath } from '@/lib/api/client'
import { Composer } from './composer'
import { SUGGESTED_PROMPTS } from './suggested-prompts'
import { TurnView } from './turn'
import { useAsk } from './use-ask'
import { ConversationMenu } from './conversation-menu'
import { useConversations } from './use-conversations'

function EmptyState({ onPick }: { onPick: (prompt: string) => void }) {
  return (
    <div className="px-4 py-5 sm:px-6">
      <div className="flex items-start gap-4">
        <ChakSprite size={48} />
        <p className="max-w-[46ch] text-[14px] leading-relaxed text-ink-2">
          Four prompts, four different paths through the router. The last one is the one to
          watch: Chak answers it without calling a tool at all.
        </p>
      </div>
      <ul className="mt-4 grid gap-px bg-rule">
        {SUGGESTED_PROMPTS.map((prompt) => (
          <li key={prompt.text}>
            <button
              type="button"
              onClick={() => onPick(prompt.text)}
              className="grid w-full grid-cols-1 items-baseline gap-x-4 gap-y-1 bg-surface px-3 py-2.5 text-left transition-colors hover:bg-accent-wash sm:grid-cols-[1fr_auto]"
            >
              <span className="text-[14px] leading-snug text-ink">{prompt.text}</span>
              <span className="font-mono text-[11px] whitespace-nowrap text-ink-3">
                {prompt.exercises}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function ChakConsole() {
  const { active, history, setActiveTurns, startNew, switchTo, remove } = useConversations()
  const { instance, turns } = active
  const { submit, retry, isPending } = useAsk(instance, turns, setActiveTurns)
  const threadRef = useRef<HTMLDivElement>(null)
  const seenInstance = useRef<string | null>(null)

  // Keep the newest turn in view. The pending row and the answered row are the
  // same element, so this fires once per turn rather than jumping twice.
  // Also fires on a conversation switch, which is what puts a restored
  // transcript at its most recent message rather than the top.
  useEffect(() => {
    const thread = threadRef.current
    const firstRun = seenInstance.current === null
    const switched = !firstRun && seenInstance.current !== instance
    seenInstance.current = instance
    if (!thread || turns.length === 0) return
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'

    // lg and up: the console is a fixed-height panel and the thread scrolls.
    if (thread.scrollHeight > thread.clientHeight) {
      thread.scrollTo({ top: thread.scrollHeight, behavior })
      return
    }

    // Below lg the page scrolls, so moving the thread means moving the page.
    // Never on first load, and only when the visitor is watching the newest
    // turn (or just switched conversation), so reading elsewhere on the page
    // is never interrupted. Articles carry scroll-mb to clear the composer.
    const newest = thread.lastElementChild
    if (firstRun || !newest) return
    const { top, bottom } = newest.getBoundingClientRect()
    const watching = bottom > 0 && top < window.innerHeight
    if (switched || watching) newest.scrollIntoView({ block: 'nearest', behavior })
  }, [turns, instance])

  return (
    <section
      aria-label="Chat with Chak"
      className="flex min-h-[32rem] flex-col border border-rule bg-surface lg:h-[min(72vh,42rem)]"
    >
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-rule px-4 py-2.5 sm:px-6">
        {/* Wraps the path under its label on a narrow phone. Side by side, the
            two were wider than a 320px screen and pushed the page sideways. */}
        <p className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="font-mono text-[11px] whitespace-nowrap text-ink-3">memory scope</span>
          <code className="truncate font-mono text-[12px] text-ink-2">{instancePath(instance)}</code>
        </p>
        <div className="flex items-center gap-2">
          <ConversationMenu
            history={history}
            activeInstance={instance}
            onSelect={switchTo}
            onRemove={remove}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={startNew}
            className="font-mono text-[11.5px] pointer-coarse:h-11"
          >
            <PlusIcon aria-hidden weight="bold" />
            New
          </Button>
        </div>
      </header>

      <div ref={threadRef} className="flex-1 overflow-y-auto">
        {turns.length === 0 ? (
          <EmptyState onPick={submit} />
        ) : (
          turns.map((turn) => <TurnView key={turn.id} turn={turn} onRetry={retry} />)
        )}
      </div>

      <Composer onSubmit={submit} disabled={isPending} />
    </section>
  )
}
