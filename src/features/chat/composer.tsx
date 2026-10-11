import { useEffect, useRef } from 'react'
import { ArrowUpIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { COMPOSER_ID, useComposerDraft } from './composer-draft'

interface ComposerProps {
  onSubmit: (question: string) => void
  disabled: boolean
  /** A conversation is open, so the composer sits under the thread. Before the
   *  first message it sits in the middle of the hero, under the greeting. */
  docked: boolean
}

/**
 * One box, like a ChatGPT prompt: the field on top, a row under it with the
 * keyboard hint and the send button. The box carries the focus ring (accent,
 * one of marmalade's four jobs) because the field inside it has no border.
 */
export function Composer({ onSubmit, disabled, docked }: ComposerProps) {
  const [value, setValue] = useComposerDraft()
  const ref = useRef<HTMLTextAreaElement>(null)

  // Focus on load so a visitor can type immediately, but only where the chat
  // fills the first viewport. Below lg, autofocus would raise the software
  // keyboard before the visitor has read anything. preventScroll keeps the page
  // anchored.
  useEffect(() => {
    if (!window.matchMedia('(min-width: 1024px)').matches) return
    ref.current?.focus({ preventScroll: true })
  }, [])

  const send = () => {
    const question = value.trim()
    if (!question || disabled) return
    onSubmit(question)
    setValue('')
    ref.current?.focus()
  }

  return (
    <div
      className={cn(
        'w-full shrink-0',
        // Docked below lg the page scrolls, not the thread, so the composer
        // sticks to the bottom of the viewport. On touch it lets go while
        // focused: iOS Safari can leave a sticky field behind the keyboard, and
        // a static one is scrolled into view by the browser itself.
        docked
          ? 'sticky bottom-0 z-10 bg-surface pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:static lg:pb-6 pointer-coarse:focus-within:static'
          : 'pt-8',
      )}
    >
      {/* Padding inside the column cap, like the header and the turns, so all
          three share one edge. */}
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <form
          onSubmit={(event) => {
            event.preventDefault()
            send()
          }}
          // A quiet ring on focus: it is there on load at lg, where the field is
          // focused for the visitor, so it should mark focus without shouting.
          className="rounded-sm border border-rule-strong bg-surface shadow-composer transition-colors has-[textarea:focus-visible]:border-ring has-[textarea:focus-visible]:ring-2 has-[textarea:focus-visible]:ring-ring/20"
        >
          {/* No placeholder-as-label: the real label is here for assistive tech and
              the visible affordance is the keyboard hint below. */}
          <label htmlFor={COMPOSER_ID} className="sr-only">
            Ask Chak a question
          </label>
          <Textarea
            id={COMPOSER_ID}
            ref={ref}
            rows={1}
            enterKeyHint="send"
            value={value}
            disabled={disabled}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                send()
              }
            }}
            placeholder="Ask about a ticket or an IT problem"
            // 16px below sm: iOS Safari zooms the page into any field set smaller.
            className="max-h-48 min-h-12 resize-none rounded-none border-0 bg-transparent px-4 pt-3.5 pb-1 text-base leading-relaxed shadow-none placeholder:text-ink-3 focus-visible:ring-0 disabled:bg-transparent sm:text-[15px] md:text-[15px]"
          />
          <div className="flex items-center gap-3 pr-2.5 pb-2.5 pl-4">
            {/* Phones have no Shift key; their return key reads "send" instead. */}
            <p className="font-mono text-[11px] text-ink-3 pointer-coarse:hidden">
              Enter to send · Shift + Enter for a new line
            </p>
            <Button
              type="submit"
              size="icon"
              aria-label="Send"
              disabled={disabled || value.trim().length === 0}
              className="ml-auto size-9 pointer-coarse:size-11"
            >
              <ArrowUpIcon aria-hidden weight="bold" className="size-4" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
