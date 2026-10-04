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
    <div className="border-t border-rule bg-surface px-4 py-3 sm:px-6">
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
          className="max-h-40 min-h-9 resize-none border-rule bg-paper px-2.5 py-2 text-[15px] leading-relaxed placeholder:text-ink-3 md:text-[15px]"
        />
        <Button type="submit" disabled={disabled || value.trim().length === 0} className="h-9 px-3">
          Send
          <ArrowUpIcon aria-hidden weight="bold" />
        </Button>
      </form>
      <p className="mt-2 font-mono text-[10.5px] text-ink-3">
        Enter to send · Shift + Enter for a new line
      </p>
    </div>
  )
}
