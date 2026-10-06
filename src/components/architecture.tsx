import { AGENT, SITE } from '@/lib/site'

/** The one sub-agent. Its tools are the router's TOOLS in ada-agent/src/index.ts,
 *  all dispatched to ItAgent. */
const IT_AGENT = {
  name: 'IT',
  binding: 'ItAgent',
  transport: 'cross-DO fetch',
  tools: ['lookup_ticket', 'list_my_tickets', 'create_ticket'],
}

const LOOP_STEPS = [
  {
    verb: 'Receive',
    detail: 'The instance id in the URL selects the Durable Object, which already holds this visitor’s history.',
  },
  {
    verb: 'Check',
    detail: `Before the model runs, Jev (${SITE.jevModel}) scores the question for injection, scope, and pasted secrets. A clear attack (above ${SITE.guardBlock.injectionAbove}), or a suspicious question that is not IT work, ends the turn here with a fixed refusal; everything else goes on with its scores in the trace.`,
  },
  {
    verb: 'Decide',
    detail: 'The model sees the system prompt, the history, and the tool schemas, then either answers or emits tool calls.',
  },
  {
    verb: 'Dispatch',
    detail: 'Each tool call is routed to its sub-agent stub and awaited. Before create_ticket goes out, Jev triages the new ticket and code sets its priority. Then the loop pauses: the Durable Object saves where it stopped, and the ticket comes back to you to approve, edit, or decline. Your decision arrives as the next request and the loop resumes there. Each result is recorded into the trace and goes back into the message list as a tool-role turn, keyed by tool_call_id.',
  },
  {
    verb: 'Verify',
    detail: `When the model answers without calling a tool, Jev reads the answer against this conversation’s tool results for unconfirmed actions, ticket details no result backs, and leaked instructions. An answer that leaks his instructions (above ${SITE.answerReplace.promptLeakAbove}) is swapped for a fixed reply, in the response and in history; the rest is recorded only.`,
  },
  {
    verb: 'Answer',
    detail: `Return the answer and the full trace. A turn that reaches ${SITE.maxIterations} passes stops instead and returns its partial trace, with no answer to verify.`,
  },
]

export function Architecture() {
  return (
    <section aria-labelledby="architecture-heading" className="border-t border-rule bg-surface">
      <div className="mx-auto max-w-[1240px] px-5 py-16 sm:px-8 lg:py-24">
        <h2
          id="architecture-heading"
          className="font-pixel text-[30px] leading-[1.15] text-ink sm:text-[36px]"
        >
          One router, one IT sub-agent
        </h2>
        <p className="mt-4 max-w-[62ch] font-pixel text-[17px] leading-[1.65] text-ink-2">
          Every box below is a Durable Object. The router holds no tools; the sub-agent holds no
          conversation. That split is what makes each one testable on its own.
        </p>

        <div className="mt-12">
          {/* Tier 0: the request */}
          <div className="mx-auto max-w-md border border-rule bg-paper px-4 py-3 text-center">
            <p className="font-mono text-[12px] text-ink">
              POST /agents/{AGENT.slug}/{'{instance}'}
            </p>
            <p className="mt-1 font-mono text-[11px] text-ink-3">{'{ question: string }'}</p>
          </div>

          <div aria-hidden className="mx-auto h-8 w-px bg-rule-strong" />

          {/* Tier 1: the router */}
          <div className="mx-auto max-w-2xl border-2 border-ink bg-paper px-5 py-4">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h3 className="font-pixel text-[20px] text-ink">{AGENT.name}</h3>
              <p className="font-mono text-[11px] text-ink-3">Durable Object, one per instance</p>
            </div>
            <p className="mt-2 text-[13.5px] leading-relaxed text-ink-2">
              Tool-calling router. Persists conversation history, owns the loop, records the trace.
            </p>
            <dl className="mt-3 grid gap-x-6 gap-y-1.5 border-t border-rule pt-3 sm:grid-cols-2">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <dt className="font-mono text-[11px] text-ink-3">model</dt>
                <dd className="font-mono text-[11.5px] break-all text-ink-2">{SITE.model}</dd>
              </div>
              <div className="flex items-baseline gap-2">
                <dt className="font-mono text-[11px] text-ink-3">max iterations</dt>
                <dd className="font-mono text-[11.5px] tabular-nums text-ink-2">
                  {SITE.maxIterations}
                </dd>
              </div>
            </dl>
          </div>

          <div aria-hidden className="mx-auto h-8 w-px bg-rule-strong" />

          {/* Tier 2: the IT sub-agent */}
          <div className="mx-auto max-w-md border border-rule-strong bg-paper px-4 py-3.5">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="font-pixel text-[18px] text-ink">{IT_AGENT.name}</h3>
              <span className="font-mono text-[11px] text-ink-3">sub-agent</span>
            </div>
            <p className="mt-1 font-mono text-[11px] text-ink-3">
              {IT_AGENT.binding} · {IT_AGENT.transport}
            </p>
            <ul className="mt-3 space-y-1 border-t border-rule pt-2.5">
              {IT_AGENT.tools.map((tool) => (
                <li key={tool} className="font-mono text-[11.5px] text-ink-2">
                  {tool}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* The loop, in the order it runs */}
        <div className="mt-16 border-t border-rule pt-10">
          <h3 className="font-pixel text-[22px] text-ink">
            What happens inside one turn
          </h3>
          <ol className="mt-6 grid gap-x-10 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
            {LOOP_STEPS.map((step, index) => (
              <li key={step.verb} className="grid grid-cols-[1.75rem_1fr] gap-x-3">
                <span className="font-mono text-[11px] tabular-nums text-ink-3">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div>
                  <h4 className="text-[14px] font-medium text-ink">{step.verb}</h4>
                  <p className="mt-1 text-[13.5px] leading-relaxed text-ink-2">{step.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}
