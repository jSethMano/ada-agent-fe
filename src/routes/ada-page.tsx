import { Architecture } from '@/components/architecture'
import { BuildersNote } from '@/components/builders-note'
import { Masthead } from '@/components/masthead'
import { SiteFooter } from '@/components/site-footer'
import { StatusLedger } from '@/components/status-ledger'
import { AdaConsole } from '@/features/chat/console'

export function AdaPage() {
  return (
    <div id="top" className="min-h-[100dvh]">
      <a
        href="#console"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:border focus:border-ink focus:bg-surface focus:px-3 focus:py-2 focus:text-[13px] focus:text-ink"
      >
        Skip to the chat
      </a>

      <Masthead />

      <main>
        {/* Asymmetric split. The console sits in the first viewport on purpose:
            a stranger should be able to ask Ada something without scrolling. */}
        <section
          aria-labelledby="hero-heading"
          className="mx-auto grid max-w-[1240px] gap-x-12 gap-y-8 px-5 pt-10 pb-16 sm:px-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-center lg:pt-16 lg:pb-20"
        >
          <div>
            <h1
              id="hero-heading"
              className="font-serif text-[40px] leading-[1.08] font-medium tracking-[-0.02em] text-ink sm:text-[52px] lg:text-[46px] xl:text-[54px]"
            >
              An agent that shows its work.
            </h1>
            <p className="mt-5 max-w-[42ch] font-serif text-[17px] leading-[1.6] text-ink-2 sm:text-[18px]">
              I built Ada to route helpdesk questions to sub-agents that hold real tools. Every tool
              call stays visible.
            </p>
          </div>

          <div id="console" className="scroll-mt-20">
            <AdaConsole />
          </div>
        </section>

        <BuildersNote />

        <div id="architecture" className="scroll-mt-16">
          <Architecture />
        </div>

        <div id="status" className="scroll-mt-16">
          <StatusLedger />
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
