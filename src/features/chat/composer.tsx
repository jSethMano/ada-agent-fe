import { useEffect, useRef } from 'react'
import { ArrowUpIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { COMPOSER_ID, useComposerDraft } from './composer-draft'

interface ComposerProps {
  onSubmit: (question: string) => void
  disabled: boolean
}

export function Composer({ onSubmit, disabled }: ComposerProps) {
  const [value, setValue] = useComposerDraft()
  const ref = useRef<HTMLTextAreaElement>(null)

  // Focus on load so a visitor can type immediately, but only where the console
  // already shares the first viewport. Below lg the console sits under the hero,
  // so autofocus would scroll past the headline and raise the software keyboard
  // before the visitor has read anything. preventScroll keeps the page anchored.
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
    // Below lg the page scrolls, not the thread, so the composer sticks to the
    // bottom of the viewport while the console is on screen. On touch it lets go
    // while focused: iOS Safari can leave a sticky field behind the keyboard,
    // and a static one is scrolled into view by the browser itself.
    <div className="sticky bottom-0 z-10 border-t border-rule bg-surface px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6 lg:static pointer-coarse:focus-within:static">
      <form
        onSubmit={(event) => {
          event.preventDefault()
          send()
        }}
        className="grid grid-cols-[1fr_auto] items-end gap-3"
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
          placeholder="Ask about a ticket, a policy, or anything else"
          // 16px below sm: iOS Safari zooms the page into any field set smaller.
          className="max-h-40 min-h-9 resize-none border-rule bg-paper px-2.5 py-2 text-base leading-relaxed placeholder:text-ink-3 sm:text-[15px] md:text-[15px] pointer-coarse:min-h-11"
        />
        <Button
          type="submit"
          disabled={disabled || value.trim().length === 0}
          className="h-9 px-3 pointer-coarse:h-11"
        >
          Send
          <ArrowUpIcon aria-hidden weight="bold" />
        </Button>
      </form>
      {/* Phones have no Shift key; their return key reads "send" instead. */}
      <p className="mt-2 font-mono text-[11px] text-ink-3 pointer-coarse:hidden">
        Enter to send · Shift + Enter for a new line
      </p>
    </div>
  )
}
