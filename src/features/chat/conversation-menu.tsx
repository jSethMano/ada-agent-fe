import { ClockCounterClockwiseIcon, TrashIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { conversationTitle, type Conversation } from './use-conversations'

const RELATIVE = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

/** Largest unit that still yields a whole number, so "3 days ago" wins over
 *  "72 hours ago" without a date library. */
function relativeTime(timestamp: number): string {
  const seconds = Math.round((timestamp - Date.now()) / 1000)
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ]
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return RELATIVE.format(Math.round(seconds / size), unit)
  }
  return 'just now'
}

interface ConversationMenuProps {
  history: Conversation[]
  activeInstance: string
  onSelect: (instance: string) => void
  onRemove: (instance: string) => void
}

export function ConversationMenu({
  history,
  activeInstance,
  onSelect,
  onRemove,
}: ConversationMenuProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="font-mono text-[11.5px] pointer-coarse:h-11">
          <ClockCounterClockwiseIcon aria-hidden weight="bold" />
          History
          {history.length > 0 && (
            <span className="text-ink-3 tabular-nums">{history.length}</span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-[min(22rem,calc(100vw-2rem))] border-rule bg-surface p-0"
      >
        <p className="border-b border-rule px-3 py-2 font-pixel text-[11px] tracking-wide text-ink-3">
          past conversations
        </p>

        {history.length === 0 ? (
          <p className="px-3 py-4 text-[13px] leading-relaxed text-ink-2">
            Nothing yet. Conversations appear here once you have asked Chak something, and stay in
            this browser.
          </p>
        ) : (
          <ul className="max-h-[min(24rem,60vh)] overflow-y-auto">
            {history.map((conversation) => {
              const isActive = conversation.instance === activeInstance
              return (
                <li
                  key={conversation.instance}
                  className="group relative border-b border-rule last:border-b-0"
                >
                  <button
                    type="button"
                    onClick={() => onSelect(conversation.instance)}
                    aria-current={isActive ? 'true' : undefined}
                    className={cn(
                      'w-full px-3 py-2.5 pr-10 text-left transition-colors hover:bg-accent-wash pointer-coarse:pr-12',
                      isActive && 'bg-accent-wash',
                    )}
                  >
                    <span
                      className={cn(
                        'block truncate text-[13.5px] leading-snug',
                        isActive ? 'text-accent-ink' : 'text-ink',
                      )}
                    >
                      {conversationTitle(conversation)}
                    </span>
                    <span className="mt-1 flex items-baseline gap-2 font-mono text-[11px] text-ink-3">
                      <span className="truncate">{conversation.instance}</span>
                      <span className="whitespace-nowrap">
                        {conversation.turns.length}{' '}
                        {conversation.turns.length === 1 ? 'turn' : 'turns'}
                      </span>
                      <span className="ml-auto whitespace-nowrap">
                        {relativeTime(conversation.updatedAt)}
                      </span>
                    </span>
                  </button>

                  {/* Always in the DOM so it is reachable by keyboard; revealed
                      on hover or focus. Touch has no hover, so there it is always
                      shown, as a full-height column that is easy to hit. */}
                  <button
                    type="button"
                    onClick={() => onRemove(conversation.instance)}
                    className="absolute top-2 right-2 p-1.5 text-ink-3 opacity-0 transition-opacity group-hover:opacity-100 hover:text-danger focus-visible:opacity-100 pointer-coarse:top-0 pointer-coarse:right-0 pointer-coarse:flex pointer-coarse:h-full pointer-coarse:items-center pointer-coarse:px-3.5 pointer-coarse:opacity-100"
                  >
                    <TrashIcon aria-hidden weight="bold" className="size-3.5" />
                    <span className="sr-only">
                      Delete conversation {conversationTitle(conversation)}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        <p className="border-t border-rule px-3 py-2 text-[11.5px] leading-relaxed text-ink-3">
          Transcripts are stored in this browser. Chak's own memory lives in the Durable Object named
          by each instance.
        </p>
      </PopoverContent>
    </Popover>
  )
}
