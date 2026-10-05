import { cn } from '@/lib/utils'
import { ChakSprite } from './chak-sprite'

interface EnlargeChatButtonProps {
  enlarged: boolean
  onToggle: () => void
}

/**
 * The hero sprite as a control that gives the console the hero's whole row.
 * Desktop only: below `lg` the console is already full width, so the page
 * renders the plain sprite there instead. The callout is the label, which is
 * why the sprite itself can stay aria-hidden.
 */
export function EnlargeChatButton({ enlarged, onToggle }: EnlargeChatButtonProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={enlarged}
      aria-controls="console"
      className={cn(
        'group hidden cursor-pointer items-center gap-4 text-left active:translate-y-px lg:flex',
        !enlarged && 'mb-6',
      )}
    >
      {/* Smaller once enlarged, so the console starts near the top. */}
      <ChakSprite size={enlarged ? 64 : 128} />
      <span className="relative rounded-sm border border-rule-strong bg-surface px-3 py-1.5 text-[13px] whitespace-nowrap text-ink-2 transition-colors group-hover:bg-accent-wash group-hover:text-ink">
        {/* The tail: a rotated square whose two visible borders point at him. */}
        <span
          aria-hidden
          className="absolute top-1/2 -left-[5px] size-2 -translate-y-1/2 rotate-45 border-b border-l border-rule-strong bg-surface transition-colors group-hover:bg-accent-wash"
        />
        <span className="pointer-coarse:hidden">click</span>
        <span className="hidden pointer-coarse:inline">tap</span> me to {enlarged ? 'shrink' : 'enlarge'}
        <span className="sr-only"> the chat</span>
      </span>
    </button>
  )
}
