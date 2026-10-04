import { cn } from '@/lib/utils'
import { AGENT, SITE } from '@/lib/site'

interface SubAgent {
  name: string
  binding: string
  live: boolean
  transport: string
  tools: string[]
}

const SUB_AGENTS: SubAgent[] = [
  {
    name: 'IT',
    binding: 'ItAgent',
    live: true,
    transport: 'cross-DO fetch',
    tools: ['lookup_ticket', 'create_ticket'],
  },
  {
    name: 'HR',
    binding: 'HrAgent',
    live: false,
    transport: 'MCP',
    tools: ['leave_balance', 'benefits_lookup'],
  },
  {
    name: 'Docs',
    binding: 'DocsAgent',
    live: false,
    transport: 'MCP',
    tools: ['search_policies'],
  },
]

/** Connector segments. Purely presentational, hidden from assistive tech, and
 *  dropped entirely on mobile where the stack order carries the same meaning. */
function Connector({ side }: { side: 'left' | 'center' | 'right' }) {
  return (
    <div className="relative h-8">
      {/* Horizontal sits at top-0 so it meets the vertical dropping out of the
          router box exactly, with no gap at the junction. */}
      <span
        className={cn(
          'absolute top-0 h-px bg-rule-strong',
          side === 'left' && 'right-0 left-1/2',
          side === 'center' && 'inset-x-0',
          side === 'right' && 'left-0 right-1/2',
        )}
      />
      <span className="absolute top-0 bottom-0 left-1/2 w-px bg-rule-strong" />
    </div>
  )
}

const LOOP_STEPS = [
  {
    verb: 'Receive',
    detail: 'The instance id in the URL selects the Durable Object, which already holds this visitor’s history.',
  },
  {
    verb: 'Check',
    detail: `Alongside the first model call, Jev (${SITE.jevModel}) scores the question for injection, scope, and pasted secrets. The scores go into the trace; nothing acts on them yet.`,
  },
  {
    verb: 'Decide',
    detail: 'The model sees the system prompt, the history, and the tool schemas, then either answers or emits tool calls.',
  },
  {
    verb: 'Dispatch',
    detail: 'Each tool call is routed to its sub-agent stub and awaited. Results are recorded into the trace.',
  },
  {
    verb: 'Fold in',
    detail: 'Tool results go back into the message list as tool-role turns, keyed by tool_call_id.',
  },
  {
    verb: 'Answer',
    detail: `Loop until the model stops calling tools, or stop at ${SITE.maxIterations} passes and return the partial trace.`,
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
          One router, three sub-agents
        </h2>
        <p className="mt-4 max-w-[62ch] font-pixel text-[17px] leading-[1.65] text-ink-2">
          Every box below is a Durable Object. The router holds no tools; the sub-agents hold no
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

          <div aria-hidden className="mx-auto hidden h-8 w-px bg-rule-strong sm:block" />
          {/* Phones stack the sub-agents on a left rail; this joins it to the router. */}
          <div aria-hidden className="h-4 w-px bg-rule sm:hidden" />
          <div aria-hidden className="hidden grid-cols-3 sm:grid">
            <Connector side="left" />
            <Connector side="center" />
            <Connector side="right" />
          </div>

          {/* Tier 2: sub-agents. Status is carried by border treatment and a word,
              never by a coloured dot. */}
          <ul className="grid gap-4 border-l border-rule pl-5 sm:grid-cols-3 sm:border-l-0 sm:pl-0">
            {SUB_AGENTS.map((agent) => (
              <li
                key={agent.name}
                className={cn(
                  'bg-paper px-4 py-3.5',
                  agent.live ? 'border border-rule-strong' : 'border border-dashed border-rule',
                )}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <h3
                    className={cn(
                      'font-pixel text-[18px]',
                      agent.live ? 'text-ink' : 'text-ink-3',
                    )}
                  >
                    {agent.name}
                  </h3>
                  <span className="font-mono text-[11px] text-ink-3">
                    {agent.live ? 'live' : 'planned'}
                  </span>
                </div>
                <p className="mt-1 font-mono text-[11px] text-ink-3">
                  {agent.binding} · {agent.transport}
                </p>
                <ul className="mt-3 space-y-1 border-t border-rule pt-2.5">
                  {agent.tools.map((tool) => (
                    <li
                      key={tool}
                      className={cn(
                        'font-mono text-[11.5px]',
                        agent.live ? 'text-ink-2' : 'text-ink-3',
                      )}
                    >
                      {tool}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
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
