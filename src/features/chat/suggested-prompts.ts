/**
 * Four prompts, each exercising a different path through the router.
 *
 * The `exercises` label is not decoration: it tells a first-time visitor which
 * path to look for in the trace. Every label must match what the latest eval
 * measured. The last one was "What makes a strong password?", answered with no
 * tool, until iteration 4 (2026-10-13) showed every IT how-to question now
 * searches the help articles first. Its replacement is the question the eval
 * measures against an article (`kb-vpn-wont-connect`).
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
    text: "The VPN won't connect when I work from home. What should I try?",
    exercises: 'search_kb, answers from an article',
  },
]
