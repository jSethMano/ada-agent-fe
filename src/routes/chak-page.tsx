import { Architecture } from '@/components/architecture'
import { BuildersNote } from '@/components/builders-note'
import { Capabilities } from '@/components/capabilities'
import { ChakSprite } from '@/components/chak-sprite'
import { Masthead } from '@/components/masthead'
import { SiteFooter } from '@/components/site-footer'
import { StatusLedger } from '@/components/status-ledger'
import { ChakConsole } from '@/features/chat/console'

export function ChakPage() {
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
            a stranger should be able to ask Chak something without scrolling. */}
        <section
          aria-labelledby="hero-heading"
          className="mx-auto grid max-w-[1240px] gap-x-12 gap-y-8 px-5 pt-10 pb-16 sm:px-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-center lg:pt-16 lg:pb-20"
        >
          <div>
            {/* 64px on small screens so the console stays close to the fold;
                both sizes are whole multiples of the 16px grid. */}
            <ChakSprite size={64} className="mb-6 lg:size-32" />
            <h1
              id="hero-heading"
              className="font-pixel text-[40px] leading-[1.08] text-ink sm:text-[52px] lg:text-[46px] xl:text-[54px]"
            >
              A helpdesk cat who shows his work.
            </h1>
            <p className="mt-5 max-w-[42ch] font-pixel text-[17px] leading-[1.6] text-ink-2 sm:text-[18px]">
              I built Chak, an orange-and-white office cat, to route helpdesk questions to
              sub-agents that hold real tools. Every tool call stays visible.
            </p>
          </div>

          <div id="console" className="scroll-mt-20">
            <ChakConsole />
          </div>
        </section>

        <div id="capabilities" className="scroll-mt-16">
          <Capabilities />
        </div>

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
