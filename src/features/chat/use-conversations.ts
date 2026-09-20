import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import type { Turn } from '@/lib/api/types'

const STORAGE_KEY = 'ada.conversations.v1'
/** Pre-history key, read once so an existing visitor keeps their instance. */
const LEGACY_INSTANCE_KEY = 'ada.instance'

/** Oldest conversations are dropped past this. Traces are the bulk of the
 *  payload and localStorage is a hard 5MB, so this is not decorative. */
const MAX_CONVERSATIONS = 20

/** Crockford-ish: no I, L, O, U, so a read-aloud id never gets transcribed wrong. */
const ALPHABET = '0123456789abcdefghjkmnpqrstvwxyz'

export interface Conversation {
  /** Doubles as the Durable Object instance name, so switching conversations
   *  switches which memory scope Ada answers from. */
  instance: string
  turns: Turn[]
  createdAt: number
  updatedAt: number
}

function mintInstance(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(5))
  return `visitor-${Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('')}`
}

function newConversation(): Conversation {
  const now = Date.now()
  return { instance: mintInstance(), turns: [], createdAt: now, updatedAt: now }
}

/** The label shown in the history list. Derived rather than stored so an edited
 *  or retried first turn cannot leave a stale title behind. */
export function conversationTitle(conversation: Conversation): string {
  const first = conversation.turns[0]?.question?.trim()
  if (!first) return 'Empty conversation'
  return first.length > 60 ? `${first.slice(0, 59)}…` : first
}

function isConversation(value: unknown): value is Conversation {
  if (!value || typeof value !== 'object') return false
  const c = value as Conversation
  return typeof c.instance === 'string' && Array.isArray(c.turns) && typeof c.createdAt === 'number'
}

function load(): Conversation[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed: unknown = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed.filter(isConversation)
    }
    const legacy = window.localStorage.getItem(LEGACY_INSTANCE_KEY)
    if (legacy) {
      const now = Date.now()
      return [{ instance: legacy, turns: [], createdAt: now, updatedAt: now }]
    }
  } catch {
    // Private browsing, blocked storage, or corrupt JSON. Starting fresh is a
    // better outcome than a console that refuses to render.
  }
  return []
}

/**
 * Conversation history, held in the browser.
 *
 * The Durable Object is the source of truth for what Ada *remembers*, but it
 * stores only `{ role, content }` message history. It does not keep the tool
 * trace, iteration counts, or roundtrip timings, which are the whole point of
 * this page. So the rendered transcript lives here and the agent's memory lives
 * there; switching conversations switches both, because the instance id is the
 * memory scope.
 */
export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    const loaded = load()
    return loaded.length > 0 ? loaded : [newConversation()]
  })

  const [activeInstance, setActiveInstance] = useState<string>(
    () => [...conversations].sort((a, b) => b.updatedAt - a.updatedAt)[0].instance,
  )

  // Skip the first write so a fresh visitor does not get a storage entry before
  // they have actually said anything.
  const hydrated = useRef(false)
  useEffect(() => {
    if (!hydrated.current) {
      hydrated.current = true
      return
    }
    try {
      const persistable = conversations
        .filter((c) => c.turns.length > 0)
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, MAX_CONVERSATIONS)
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(persistable))
    } catch {
      // Quota exceeded most likely. The session keeps working in memory.
    }
  }, [conversations])

  const active =
    conversations.find((c) => c.instance === activeInstance) ?? conversations[0] ?? newConversation()

  const setActiveTurns = useCallback<Dispatch<SetStateAction<Turn[]>>>(
    (update) => {
      setConversations((prev) =>
        prev.map((c) =>
          c.instance === activeInstance
            ? {
                ...c,
                turns: typeof update === 'function' ? update(c.turns) : update,
                updatedAt: Date.now(),
              }
            : c,
        ),
      )
    },
    [activeInstance],
  )

  const startNew = useCallback(() => {
    const created = newConversation()
    setConversations((prev) => [created, ...prev.filter((c) => c.turns.length > 0)])
    setActiveInstance(created.instance)
  }, [])

  const switchTo = useCallback((instance: string) => {
    setActiveInstance(instance)
  }, [])

  const remove = useCallback(
    (instance: string) => {
      setConversations((prev) => {
        const next = prev.filter((c) => c.instance !== instance)
        if (next.length === 0) {
          const created = newConversation()
          setActiveInstance(created.instance)
          return [created]
        }
        if (instance === activeInstance) {
          setActiveInstance([...next].sort((a, b) => b.updatedAt - a.updatedAt)[0].instance)
        }
        return next
      })
    },
    [activeInstance],
  )

  /** Newest first, empty ones hidden: an unused conversation is not history. */
  const history = conversations
    .filter((c) => c.turns.length > 0)
    .sort((a, b) => b.updatedAt - a.updatedAt)

  return { active, history, setActiveTurns, startNew, switchTo, remove }
}
