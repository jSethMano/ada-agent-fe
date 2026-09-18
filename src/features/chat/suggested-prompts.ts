/**
 * Four prompts, each exercising a different path through the router.
 *
 * The `exercises` label is not decoration. A first-time visitor needs to know
 * that the third one answering with no tool call is the interesting result, not
 * a failure: it shows the router deciding, rather than reaching for a tool
 * because a tool exists.
 *
 * Ticket 42 and 77 are the seeded records in ItAgent's fixture table.
 */
export interface SuggestedPrompt {
  text: string
  exercises: string
}

export const SUGGESTED_PROMPTS: readonly SuggestedPrompt[] = [
  {
    text: 'Look up ticket 42',
    exercises: 'lookup_ticket',
  },
  {
    text: 'My screen keeps flickering, file a ticket',
    exercises: 'create_ticket',
  },
  {
    text: 'Check ticket 42, and if it is not resolved open a follow-up for the same VPN issue',
    exercises: 'two tool calls',
  },
  {
    text: "What's the capital of France?",
    exercises: 'no tools, answers directly',
  },
]
