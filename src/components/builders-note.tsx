import { SITE } from '@/lib/site'

export function BuildersNote() {
  return (
    <section aria-labelledby="note-heading" className="border-t border-rule">
      <div className="mx-auto grid max-w-[1240px] gap-x-12 gap-y-8 px-5 py-16 sm:px-8 lg:grid-cols-[minmax(0,62ch)_minmax(0,1fr)] lg:py-24">
        <div>
          <h2
            id="note-heading"
            className="font-pixel text-[30px] leading-[1.15] text-ink sm:text-[36px]"
          >
            What it actually does
          </h2>

          <div className="mt-6 space-y-5 font-pixel text-[17px] leading-[1.65] text-ink-2">
            <p>
              Chak is an internal helpdesk agent for a company that does not exist. Employees ask
              him about IT, HR, and internal documentation. He either answers from the model
              directly or hands the question to a sub-agent that holds real tools.
            </p>
            <p>
              The part worth looking at is the loop. Chak has no tools of his own. He has a router
              that decides whether a question needs data, picks a tool, calls into a separate
              Durable Object across a fetch boundary, folds the result back into the message list,
              and runs the model again. Up to {SITE.maxIterations} passes per turn. Most questions
              take one. Asking him to check a ticket and then open a follow-up takes two, and the
              iteration count in the trace goes up to match.
            </p>
            <p>
              I show the trace because it is the only honest way to tell an agent apart from a chat
              wrapper. Every payload under every tool call is the real request and the real
              response, printed without editing.
            </p>
          </div>
        </div>

        <aside className="border-t border-rule pt-5 lg:border-t-0 lg:border-l lg:pt-1 lg:pl-8">
          <p className="font-pixel text-[10.5px] tracking-wide text-ink-3">what is real</p>
          <dl className="mt-3 space-y-3.5 text-[13.5px] leading-relaxed">
            <div>
              <dt className="font-mono text-[12px] text-ink">model, routing, memory</dt>
              <dd className="mt-0.5 text-ink-2">
                Real. Live inference on Workers AI, real tool dispatch across Durable Objects, and
                conversation history persisted per instance.
              </dd>
            </div>
            <div>
              <dt className="font-mono text-[12px] text-ink">ticket data</dt>
              <dd className="mt-0.5 text-ink-2">
                Half real. Tickets 42 and 77 are seeded fixtures, but anything you file is written
                to the IT sub-agent’s own storage and can be looked up afterwards, including from a
                different conversation.
              </dd>
            </div>
          </dl>
        </aside>
      </div>
    </section>
  )
}
