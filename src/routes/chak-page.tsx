import { Architecture } from '@/components/architecture'
import { BuildersNote } from '@/components/builders-note'
import { Capabilities } from '@/components/capabilities'
import { EvalResults } from '@/components/eval-results'
import { Masthead } from '@/components/masthead'
import { SiteFooter } from '@/components/site-footer'
import { StatusLedger } from '@/components/status-ledger'
import { ChakConsole } from '@/features/chat/console'

export function ChakPage() {
  return (
    <div id="top" className="min-h-[100dvh]">
      <a
        href="#console"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:border focus:border-ink focus:bg-surface focus:px-3 focus:py-2 focus:text-[13px] focus:text-ink"
      >
        Skip to the chat
      </a>

      <Masthead />

      <main>
        {/* The hero is the chat, so a stranger can ask Chak something without
            scrolling. It owns the page's h1 and the #console anchor. */}
        <ChakConsole />

        <div id="capabilities" className="scroll-mt-16">
          <Capabilities />
        </div>

        <BuildersNote />

        <div id="architecture" className="scroll-mt-16">
          <Architecture />
        </div>

        <div id="evals" className="scroll-mt-16">
          <EvalResults />
        </div>

        <div id="status" className="scroll-mt-16">
          <StatusLedger />
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
