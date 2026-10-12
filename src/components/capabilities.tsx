import { ArrowUpIcon } from "@phosphor-icons/react";
import { Highlight } from "@/components/highlight";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { prefillComposer } from "@/features/chat/composer-draft";
import { CANNOT, CAPABILITIES, GUARDRAILS } from "@/lib/site";

export function Capabilities() {
  return (
    <section
      aria-labelledby="capabilities-heading"
      className="border-t border-rule"
    >
      <div className="mx-auto max-w-[1240px] px-5 py-16 sm:px-8 lg:py-24">
        <h2
          id="capabilities-heading"
          className="text-[30px] leading-[1.15] font-semibold tracking-tight sm:text-[36px]"
        >
          <Highlight>What Chak can do, besides meowing when he's hungry.</Highlight>
        </h2>
        <p className="mt-4 max-w-[62ch] text-[17px] leading-[1.65] text-ink-2">
          Everything listed here is live, and each one is read off the Worker
          source. Trying one puts its prompt in the chat box above; you choose
          when to send it.
        </p>

        {/* The list is an accordion: each row shows what Chak does and the
            mechanism behind it, and opens to the detail and a prompt to try.
            The first is open so the rows read as openable. What he cannot do
            sits beside it, so the two are read together. */}
        <div className="mt-10 grid grid-cols-1 gap-x-12 gap-y-12 lg:grid-cols-3">
          <Accordion
            type="multiple"
            defaultValue={[CAPABILITIES[0].title]}
            className="border-y border-rule lg:col-span-2"
          >
            {CAPABILITIES.map(({ title, detail, mechanism, example }) => (
              <AccordionItem
                key={title}
                value={title}
                className="border-rule"
              >
                <AccordionTrigger className="gap-4 py-4 hover:no-underline">
                  {/* Radix renders the header as the h3, so the title is a span
                      inside it, and only the title underlines on hover. */}
                  <span className="min-w-0">
                    <span className="block text-[18px] leading-snug font-medium text-ink underline-offset-4 group-hover/accordion-trigger:underline">
                      {title}
                    </span>
                    <span className="mt-1 block text-[12px] font-normal text-ink-3">
                      {mechanism}
                    </span>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pb-5">
                  <p className="max-w-[62ch] text-[14px] leading-relaxed text-ink-2">
                    {detail}
                  </p>
                  {example && (
                    <button
                      type="button"
                      onClick={() => prefillComposer(example)}
                      className="mt-3 inline-flex max-w-full items-start gap-1.5 text-left text-[13.5px] leading-snug text-accent-ink underline-offset-4 hover:underline pointer-coarse:mt-0 pointer-coarse:-mb-3 pointer-coarse:min-h-11 pointer-coarse:py-3"
                    >
                      <ArrowUpIcon
                        aria-hidden
                        weight="bold"
                        className="mt-[3px] size-3 shrink-0"
                      />
                      <span>
                        <span className="sr-only">Try: </span>“{example}”
                      </span>
                    </button>
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          {/* Sticky at lg, so the limits stay beside whichever row is open. */}
          <div className="space-y-10 lg:sticky lg:top-24 lg:self-start">
            <div>
              <h3 className="border-b border-rule-strong pb-2 text-[12px] font-medium tracking-wide text-ink-3">
                cannot do
              </h3>
              <ul className="mt-4 space-y-2.5">
                {CANNOT.map((item) => (
                  <li
                    key={item}
                    className="text-[14px] leading-relaxed text-ink-2"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="border-b border-rule-strong pb-2 text-[12px] font-medium tracking-wide text-ink-3">
                limits
              </h3>
              <ul className="mt-4 space-y-2.5">
                {GUARDRAILS.map((item) => (
                  <li
                    key={item}
                    className="text-[13px] leading-relaxed text-ink-2"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
