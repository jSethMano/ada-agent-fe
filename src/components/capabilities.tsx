import { ArrowUpIcon } from '@phosphor-icons/react'
import { prefillComposer } from '@/features/chat/composer-draft'
import { CANNOT, CAPABILITIES, GUARDRAILS } from '@/lib/site'

export function Capabilities() {
  return (
    <section aria-labelledby="capabilities-heading" className="border-t border-rule">
      <div className="mx-auto max-w-[1240px] px-5 py-16 sm:px-8 lg:py-24">
        <h2
          id="capabilities-heading"
          className="font-pixel text-[30px] leading-[1.15] text-ink sm:text-[36px]"
        >
          What Chak can do
        </h2>
        <p className="mt-4 max-w-[62ch] font-pixel text-[17px] leading-[1.65] text-ink-2">
          Everything listed here is live, and each one is read off the Worker source. Trying one
          puts its prompt in the chat box above; you choose when to send it.
        </p>

        {/* Rows, not cards: hairlines carry the grid, the same as the status ledger. */}
        <ul className="mt-10 grid gap-x-10 sm:grid-cols-2 lg:grid-cols-3">
          {CAPABILITIES.map(({ title, detail, mechanism, example }) => (
            <li key={title} className="border-t border-rule py-5">
              <h3 className="font-pixel text-[18px] leading-snug text-ink">{title}</h3>
              <p className="mt-1.5 text-[14px] leading-relaxed text-ink-2">{detail}</p>
              <p className="mt-2 font-mono text-[11px] text-ink-3">{mechanism}</p>
              {example && (
                <button
                  type="button"
                  onClick={() => prefillComposer(example)}
                  className="mt-3 inline-flex max-w-full items-start gap-1.5 text-left text-[13.5px] leading-snug text-accent-ink underline-offset-4 hover:underline"
                >
                  <ArrowUpIcon aria-hidden weight="bold" className="mt-[3px] size-3 shrink-0" />
                  <span>
                    <span className="sr-only">Try: </span>“{example}”
                  </span>
                </button>
              )}
            </li>
          ))}
        </ul>

        <div className="mt-12 grid gap-x-10 gap-y-10 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <h3 className="border-b border-rule-strong pb-2 font-pixel text-[11px] tracking-wide text-ink-3">
              cannot do
            </h3>
            <ul className="mt-4 space-y-2.5">
              {CANNOT.map((item) => (
                <li key={item} className="text-[14px] leading-relaxed text-ink-2">
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="border-b border-rule-strong pb-2 font-pixel text-[11px] tracking-wide text-ink-3">
              limits
            </h3>
            <ul className="mt-4 space-y-2.5">
              {GUARDRAILS.map((item) => (
                <li key={item} className="font-mono text-[12px] leading-relaxed text-ink-2">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
