import { ArrowUpRightIcon } from '@phosphor-icons/react'
import { ChakSprite } from '@/components/chak-sprite'
import { PUBLISHED_REPOS, SITE, STACK } from '@/lib/site'

export function SiteFooter() {
  return (
    <footer className="border-t border-rule bg-surface">
      <div className="mx-auto grid max-w-[1240px] gap-x-10 gap-y-10 px-5 py-14 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div>
          <p className="flex items-center gap-2.5 font-pixel text-[20px] text-ink">
            <ChakSprite size={32} />
            chak
          </p>
          <p className="mt-2 max-w-[44ch] text-[13.5px] leading-relaxed text-ink-2">
            An internal helpdesk agent running on Cloudflare Workers. Built as a working reference
            for how a router agent, sub-agents, and a tool loop fit together.
          </p>
          {PUBLISHED_REPOS.length > 0 && (
            <ul className="mt-4 space-y-1.5">
              {PUBLISHED_REPOS.map((repo) => (
                <li key={repo.url}>
                  <a
                    href={repo.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[13.5px] text-accent-ink underline-offset-4 hover:underline"
                  >
                    {repo.label}
                    <ArrowUpRightIcon aria-hidden weight="bold" className="size-3" />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="grid gap-x-8 gap-y-8 sm:grid-cols-2">
          <div>
            <h2 className="border-b border-rule pb-2 font-pixel text-[10.5px] tracking-wide text-ink-3">
              stack
            </h2>
            <ul className="mt-3 space-y-1.5">
              {STACK.map((entry) => (
                <li key={entry.label} className="flex items-baseline justify-between gap-3">
                  <span className="text-[13px] text-ink-2">{entry.label}</span>
                  <span className="font-mono text-[10.5px] whitespace-nowrap text-ink-3">
                    {entry.detail}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="border-b border-rule pb-2 font-pixel text-[10.5px] tracking-wide text-ink-3">
              inference
            </h2>
            <dl className="mt-3 space-y-2.5 text-[13px]">
              <div>
                <dt className="text-ink-2">Current model</dt>
                <dd className="mt-0.5 font-mono text-[11px] break-all text-ink-3">{SITE.model}</dd>
              </div>
              <div>
                <dt className="text-ink-2">Fallback</dt>
                <dd className="mt-0.5 font-mono text-[11px] break-all text-ink-3">
                  {SITE.previousModel}
                </dd>
              </div>
              <div>
                <dt className="text-ink-2">Hosting</dt>
                <dd className="mt-0.5 text-ink-3">
                  Workers AI inference, Durable Objects for state, deployed on Cloudflare.
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </footer>
  )
}
