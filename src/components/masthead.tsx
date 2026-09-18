import { ArrowUpRightIcon } from '@phosphor-icons/react'
import { SITE } from '@/lib/site'

export function Masthead() {
  return (
    <header className="sticky top-0 z-30 border-b border-rule bg-paper/92 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-[1240px] items-center justify-between gap-6 px-5 sm:px-8">
        <a
          href="#top"
          className="font-serif text-[21px] leading-none font-medium tracking-tight text-ink"
        >
          Ada
        </a>

        <nav aria-label="Sections" className="flex items-center gap-5 sm:gap-7">
          <a
            href="#architecture"
            className="text-[13.5px] text-ink-2 underline-offset-4 transition-colors hover:text-ink hover:underline"
          >
            Architecture
          </a>
          <a
            href="#status"
            className="hidden text-[13.5px] text-ink-2 underline-offset-4 transition-colors hover:text-ink hover:underline sm:inline"
          >
            Status
          </a>
          <a
            href={SITE.githubUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-[13.5px] text-accent-ink underline-offset-4 transition-colors hover:underline"
          >
            Source
            <ArrowUpRightIcon aria-hidden weight="bold" className="size-3" />
          </a>
        </nav>
      </div>
    </header>
  )
}
