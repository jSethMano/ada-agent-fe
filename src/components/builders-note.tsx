import { SITE } from '@/lib/site'
import { Highlight } from '@/components/highlight'

export function BuildersNote() {
  return (
    <section aria-labelledby="note-heading" className="border-t border-rule">
      <div className="mx-auto grid max-w-[1240px] gap-x-12 gap-y-8 px-5 py-16 sm:px-8 lg:grid-cols-[minmax(0,62ch)_minmax(0,1fr)] lg:py-24">
        <div>
          <h2
            id="note-heading"
            className="text-[30px] leading-[1.15] font-semibold tracking-tight sm:text-[36px]"
          >
            <Highlight>What it actually does</Highlight>
          </h2>

          <div className="mt-6 space-y-5 text-[17px] leading-[1.65] text-ink-2">
            <p>
              Chak is an internal IT helpdesk agent for a company that does not exist. Employees
              ask him about broken laptops, VPN trouble, password resets, and their tickets. He
              either answers from the model directly or hands the question to the IT sub-agent,
              which holds real tools. Anything that is not IT, he declines.
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
          <p className="text-[12px] font-medium tracking-wide text-ink-3">what is real</p>
          <dl className="mt-3 space-y-3.5 text-[13.5px] leading-relaxed">
            <div>
              <dt className="text-[13px] text-ink">model, routing, memory</dt>
              <dd className="mt-0.5 text-ink-2">
                Real. Live inference on Workers AI, real tool dispatch across Durable Objects, and
                conversation history persisted per instance.
              </dd>
            </div>
            <div>
              <dt className="text-[13px] text-ink">ticket data</dt>
              <dd className="mt-0.5 text-ink-2">
                Half real. Tickets 42 and 77 are seeded fixtures, but anything you file is written
                to the IT sub-agent’s own storage and can be looked up afterwards from the
                conversation that filed it.
              </dd>
            </div>
          </dl>
        </aside>
      </div>
    </section>
  )
}
