import { useState } from 'react'
import { Architecture } from '@/components/architecture'
import { BuildersNote } from '@/components/builders-note'
import { Capabilities } from '@/components/capabilities'
import { ChakSprite } from '@/components/chak-sprite'
import { EnlargeChatButton } from '@/components/enlarge-chat-button'
import { Masthead } from '@/components/masthead'
import { SiteFooter } from '@/components/site-footer'
import { StatusLedger } from '@/components/status-ledger'
import { ChakConsole } from '@/features/chat/console'
import { cn } from '@/lib/utils'

export function ChakPage() {
  // Desktop only, like the button: every class it switches is `lg:`, so below
  // lg the hero looks the same either way.
  const [chatEnlarged, setChatEnlarged] = useState(false)

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
            a stranger should be able to ask Chak something without scrolling.
            Enlarged, the console takes the whole row and the hero copy steps
            aside; the heading stays for screen readers. */}
        <section
          aria-labelledby="hero-heading"
          className={cn(
            'mx-auto grid max-w-[1240px] gap-x-12 gap-y-6 px-5 pt-6 pb-16 sm:gap-y-8 sm:px-8 sm:pt-10 lg:items-center lg:pb-20',
            chatEnlarged ? 'lg:grid-cols-1 lg:gap-y-6 lg:pt-8' : 'lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:pt-16',
          )}
        >
          <div>
            {/* 48 on phones, 64 on tablets: the console stays near the fold, and
                every size is a whole multiple of the 16px grid. Desktop gets the
                128px sprite inside the enlarge button instead. */}
            <ChakSprite size={48} className="mb-4 sm:mb-6 sm:size-16 lg:hidden" />
            <EnlargeChatButton enlarged={chatEnlarged} onToggle={() => setChatEnlarged((value) => !value)} />
            <h1
              id="hero-heading"
              className={cn(
                'font-pixel text-[34px] leading-[1.08] text-ink sm:text-[52px] lg:text-[46px] xl:text-[54px]',
                chatEnlarged && 'lg:sr-only',
              )}
            >
              A helpdesk cat who shows his work.
            </h1>
            <p
              className={cn(
                'mt-5 max-w-[42ch] font-pixel text-[17px] leading-[1.6] text-ink-2 sm:text-[18px]',
                chatEnlarged && 'lg:hidden',
              )}
            >
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
