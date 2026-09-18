import { useCallback, useState } from 'react'

const STORAGE_KEY = 'ada.instance'

/** Crockford-ish: no I, L, O, U, so a read-aloud id never gets transcribed wrong. */
const ALPHABET = '0123456789abcdefghjkmnpqrstvwxyz'

/**
 * Session ids are generated, not chosen.
 *
 * A name prompt is a signup form wearing a hat, and the first requirement of
 * this page is that a stranger can ask Ada something inside 30 seconds.
 *
 * The id is still surfaced rather than hidden: the path segment IS the Durable
 * Object memory boundary, so printing `/agents/ada/visitor-7fq2k` in the console
 * header teaches the architecture more economically than a paragraph would.
 * "New conversation" mints a fresh id, which demonstrates the same point in
 * reverse.
 */
function mintInstance(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(5))
  const suffix = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('')
  return `visitor-${suffix}`
}

function readStoredInstance(): string {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored) return stored
  } catch {
    // Private browsing or blocked storage. An ephemeral id still works fine.
  }

  const minted = mintInstance()
  try {
    window.localStorage.setItem(STORAGE_KEY, minted)
  } catch {
    /* no-op */
  }
  return minted
}

export function useSession() {
  const [instance, setInstance] = useState<string>(readStoredInstance)

  const resetSession = useCallback(() => {
    const next = mintInstance()
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* no-op */
    }
    setInstance(next)
    return next
  }, [])

  return { instance, resetSession }
}
