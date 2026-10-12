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
import { Highlight } from '@/components/highlight'

const HEADING = 'A helpdesk cat who shows his work.'

/** Before the first message: the greeting, centred like a ChatGPT start page.
 *  It and SuggestedPrompts take equal halves of the spare height, so the
 *  composer between them sits in the middle of the hero. */
function Greeting() {
  return (
    <div className="flex flex-1 flex-col items-center justify-end px-4 pt-10 text-center sm:px-6">
      <ChakSprite size={64} />
      <h1
        id="hero-heading"
        className="mt-5 max-w-[20ch] text-[30px] leading-[1.15] font-semibold tracking-tight sm:text-[40px]"
      >
        <Highlight>{HEADING}</Highlight>
      </h1>
      <p className="mt-3 max-w-[46ch] text-[16px] leading-relaxed text-ink-2 sm:text-[17px]">
        I built Chak to answer IT helpdesk questions with real tools. Every tool call stays visible.
      </p>
    </div>
  )
}

/** Under the composer before the first message. Each prompt takes a different
 *  path through the router, and its label says which. */
function SuggestedPrompts({ onPick }: { onPick: (prompt: string) => void }) {
  return (
    <div className="flex-1 pt-4 pb-10">
      <ul className="mx-auto grid max-w-3xl grid-cols-1 gap-2 px-4 sm:grid-cols-2 sm:px-6">
        {SUGGESTED_PROMPTS.map((prompt) => (
          <li key={prompt.text} className="flex">
            <button
              type="button"
              onClick={() => onPick(prompt.text)}
              className="flex w-full flex-col items-start gap-1 rounded-xl border border-rule bg-surface px-3.5 py-3 text-left transition-colors hover:bg-accent-wash"
            >
              <span className="text-[14px] leading-snug text-ink">{prompt.text}</span>
              <span className="text-[12px] text-ink-3">{prompt.exercises}</span>
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
  const { submit, retry, decide, deciding, isPending } = useAsk(instance, turns, setActiveTurns)
  const threadRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
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

    // lg and up: the hero is exactly the viewport and the thread scrolls.
    if (thread.scrollHeight > thread.clientHeight) {
      thread.scrollTo({ top: thread.scrollHeight, behavior })
      return
    }

    // Below lg the page scrolls, so moving the thread means moving the page.
    // Never on first load, and only when the visitor is watching the newest
    // turn (or just switched conversation), so reading elsewhere on the page
    // is never interrupted. Articles carry scroll-mb to clear the composer.
    const newest = listRef.current?.lastElementChild
    if (firstRun || !newest) return
    const { top, bottom } = newest.getBoundingClientRect()
    const watching = bottom > 0 && top < window.innerHeight
    if (switched || watching) newest.scrollIntoView({ block: 'nearest', behavior })
  }, [turns, instance])

  const empty = turns.length === 0

  return (
    // The hero is the chat and nothing else, like a ChatGPT start page. At lg
    // it is exactly the viewport under the masthead and the thread scrolls
    // inside it; below lg it is at least that tall and the page scrolls.
    // The composer keeps one slot in the tree, so moving from the middle to the
    // bottom on the first message never remounts it or drops the draft.
    <section
      id="console"
      aria-labelledby="hero-heading"
      className="flex min-h-[calc(100dvh-4rem)] scroll-mt-16 flex-col border-b border-rule bg-surface lg:h-[calc(100dvh-4rem)] lg:min-h-[36rem]"
    >
      <header className="mx-auto flex w-full max-w-3xl shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
        {/* The greeting holds the heading until the first message; after that it
            stays here for screen readers, because the section is labelled by it. */}
        {!empty && (
          <h1 id="hero-heading" className="sr-only">
            {HEADING}
          </h1>
        )}
        {/* Wraps the path under its label on a narrow phone. Side by side, the
            two were wider than a 320px screen and pushed the page sideways. */}
        <p className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-[12px] whitespace-nowrap text-ink-3">memory scope</span>
          <code className="truncate text-[13px] text-ink-2">{instancePath(instance)}</code>
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
            className="text-[12.5px] pointer-coarse:h-11"
          >
            <PlusIcon aria-hidden weight="bold" />
            New
          </Button>
        </div>
      </header>

      {empty ? (
        <Greeting />
      ) : (
        // Full width so the scrollbar sits at the edge, with the turns in the
        // centred column.
        <div ref={threadRef} className="w-full flex-1 overflow-y-auto">
          <div ref={listRef} className="mx-auto max-w-3xl">
            {turns.map((turn) => (
              <TurnView
                key={turn.id}
                turn={turn}
                onRetry={retry}
                onDecide={decide}
                deciding={deciding?.turnId === turn.id ? deciding.action : null}
                busy={isPending}
              />
            ))}
          </div>
        </div>
      )}

      <Composer onSubmit={submit} disabled={isPending} docked={!empty} />

      {empty ? <SuggestedPrompts onPick={submit} /> : null}
    </section>
  )
}
