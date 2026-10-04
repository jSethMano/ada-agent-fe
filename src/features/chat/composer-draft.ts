import { useSyncExternalStore } from 'react'

/** The composer textarea's id, shared so other parts of the page can focus it. */
export const COMPOSER_ID = 'chak-question'

/**
 * The composer's text, held outside React state so the capability list further
 * down the page can drop a prompt into it. Only the composer subscribes, so a
 * keystroke re-renders the composer and nothing else.
 */
let draft = ''
const listeners = new Set<() => void>()

function setDraft(next: string) {
  draft = next
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useComposerDraft() {
  return [useSyncExternalStore(subscribe, () => draft), setDraft] as const
}

/** Fill the composer and bring it into view. Never sends: the visitor still
 *  chooses, the same rule as failed turns not retrying on their own. */
export function prefillComposer(text: string) {
  setDraft(text)
  const field = document.getElementById(COMPOSER_ID)

  // lg and up the whole console fits on screen, so show all of it.
  if (window.matchMedia('(min-width: 1024px)').matches) {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    document.getElementById('console')?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' })
    field?.focus({ preventScroll: true })
    return
  }

  // Below lg the console can be taller than the screen. Focusing the field
  // scrolls the page to it, and on a phone opens the keyboard beside it.
  field?.focus()
}
