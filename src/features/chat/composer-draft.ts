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

/** Fill the composer and bring the console into view. Never sends: the visitor
 *  still chooses, the same rule as failed turns not retrying on their own. */
export function prefillComposer(text: string) {
  setDraft(text)
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  document.getElementById('console')?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' })
  document.getElementById(COMPOSER_ID)?.focus({ preventScroll: true })
}
