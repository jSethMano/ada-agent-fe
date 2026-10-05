interface Group {
  label: string
  items: string[]
}

const GROUPS: Group[] = [
  {
    label: 'shipped',
    items: [
      'Router agent with a five-pass tool-calling loop',
      'IT sub-agent reachable over a cross-Durable-Object fetch',
      'Per-instance memory, scoped by the URL path segment',
      'Tickets you file persist in the sub-agent and survive across conversations',
      'Past conversations kept in the browser, traces and all, and resumable',
      'Full tool trace returned to the client and rendered on this page',
      'Every question screened by Jev before the model runs; clear attacks refused without a model call',
      'Every answer checked by Jev against the tool results; one that leaks his instructions is replaced',
      'Rate limited to 10 requests per minute per IP',
    ],
  },
  {
    label: 'next',
    items: [
      'HR and Docs sub-agents, same contract as IT',
      'Replace the cross-DO fetch with MCP via createMcpHandler',
      'Stream the answer so tool calls appear as they resolve',
      'Add an iteration index per trace entry so passes can be grouped',
    ],
  },
  {
    label: 'known limits',
    items: [
      'Tickets 42 and 77 are seeded fixtures, not records from a real system.',
      'No auth. The instance id is a memory scope, not a credential.',
      'The Worker sends no CORS headers. Dev proxies through Vite, production through a service binding.',
      'Only the Jev checks have evals. Tool selection is still verified by hand.',
    ],
  },
]

export function StatusLedger() {
  return (
    <section aria-labelledby="status-heading" className="border-t border-rule">
      <div className="mx-auto max-w-[1240px] px-5 py-16 sm:px-8 lg:py-24">
        <h2
          id="status-heading"
          className="font-pixel text-[30px] leading-[1.15] text-ink sm:text-[36px]"
        >
          Where it stands
        </h2>

        <div className="mt-10 grid gap-x-10 gap-y-10 lg:grid-cols-3">
          {GROUPS.map((group) => (
            <div key={group.label}>
              <h3 className="border-b border-rule-strong pb-2 font-pixel text-[11px] tracking-wide text-ink-3">
                {group.label}
              </h3>
              <ul className="mt-4 space-y-3.5">
                {group.items.map((item) => (
                  <li key={item} className="text-[14px] leading-relaxed text-ink-2">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
