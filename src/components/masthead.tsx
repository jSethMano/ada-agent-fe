import { ArrowUpRightIcon } from '@phosphor-icons/react'
import { ChakSprite } from '@/components/chak-sprite'
import { PUBLISHED_REPOS } from '@/lib/site'

export function Masthead() {
  return (
    <header className="sticky top-0 z-30 border-b border-rule bg-paper/92 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-[1240px] items-center justify-between gap-6 px-5 sm:px-8">
        <a
          href="#top"
          className="flex items-center gap-2.5 font-pixel text-[21px] leading-none text-ink pointer-coarse:-my-1.5 pointer-coarse:py-1.5"
        >
          <ChakSprite size={32} />
          chak
        </a>

        {/* Phones get the two links that matter to a first-time visitor;
            Architecture and Status join from sm, where all four fit. */}
        <nav aria-label="Sections" className="flex items-center gap-5 sm:gap-7">
          <a
            href="#capabilities"
            className="text-[13.5px] text-ink-2 underline-offset-4 transition-colors hover:text-ink hover:underline pointer-coarse:-my-3 pointer-coarse:py-3"
          >
            Capabilities
          </a>
          <a
            href="#architecture"
            className="hidden text-[13.5px] text-ink-2 underline-offset-4 transition-colors hover:text-ink hover:underline sm:inline pointer-coarse:-my-3 pointer-coarse:py-3"
          >
            Architecture
          </a>
          <a
            href="#status"
            className="hidden text-[13.5px] text-ink-2 underline-offset-4 transition-colors hover:text-ink hover:underline sm:inline pointer-coarse:-my-3 pointer-coarse:py-3"
          >
            Status
          </a>
          {/* The Worker repo is the interesting one to a reviewer, so it leads. */}
          {PUBLISHED_REPOS.length > 0 && (
            <a
              href={PUBLISHED_REPOS[0].url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[13.5px] text-accent-ink underline-offset-4 transition-colors hover:underline pointer-coarse:-my-3 pointer-coarse:py-3"
            >
              Source
              <ArrowUpRightIcon aria-hidden weight="bold" className="size-3" />
            </a>
          )}
        </nav>
      </div>
    </header>
  )
}
