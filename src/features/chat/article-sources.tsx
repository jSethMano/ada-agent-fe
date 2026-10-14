import { useId, useState } from 'react'
import { BookOpenIcon } from '@phosphor-icons/react'
import { Badge } from '@/components/ui/badge'
import { SITE } from '@/lib/site'
import type { KbArticle, TraceEntry } from '@/lib/api/types'
import { citedArticles, KB_SECTIONS } from './help-articles'

const NUMBERED = /^(\d+)\.\s+/
const BULLET = /^[-*]\s+/

/** One section as the article wrote it: paragraphs, numbered steps, and dash
 *  lists. The articles use no inline Markdown, so the text renders as text. */
function SectionText({ text }: { text: string }) {
  return (
    <div className="mt-1 space-y-2">
      {text
        .trim()
        .split(/\n{2,}/)
        .map((block, index) => {
          const lines = block
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean)
          if (lines.length > 0 && lines.every((line) => NUMBERED.test(line))) {
            return (
              <ol
                key={index}
                start={Number(NUMBERED.exec(lines[0])?.[1] ?? 1)}
                className="list-decimal space-y-1 pl-5 marker:text-ink-3"
              >
                {lines.map((line, lineIndex) => (
                  <li key={lineIndex}>{line.replace(NUMBERED, '')}</li>
                ))}
              </ol>
            )
          }
          if (lines.length > 0 && lines.every((line) => BULLET.test(line))) {
            return (
              <ul key={index} className="list-disc space-y-1 pl-5 marker:text-ink-3">
                {lines.map((line, lineIndex) => (
                  <li key={lineIndex}>{line.replace(BULLET, '')}</li>
                ))}
              </ul>
            )
          }
          return <p key={index}>{lines.join(' ')}</p>
        })}
    </div>
  )
}

/** The article as the search returned it this turn: what Chak read, not a
 *  fresh copy. The id and match score are the record; the sections are the
 *  article's own words. */
function ArticlePanel({ article }: { article: KbArticle }) {
  return (
    <div className="px-3.5 py-3 sm:px-4">
      <p className="text-[14px] leading-snug font-medium text-ink">{article.title}</p>
      <p className="mt-0.5 text-[12px] text-ink-3">
        <code className="[overflow-wrap:anywhere]">{article.id}</code>
        {article.score !== undefined && ` · match ${article.score.toFixed(2)}`}
        {SITE.kb.demo && ' · demo article'}
      </p>
      <div className="mt-3 max-w-[68ch] space-y-3 text-[14px] leading-relaxed text-ink-2">
        {KB_SECTIONS.map(({ heading, field }) => {
          const text = article[field]
          if (!text?.trim()) return null
          return (
            <div key={field}>
              <p className="text-[12.5px] font-medium text-ink">{heading}</p>
              <SectionText text={text} />
            </div>
          )
        })}
      </div>
    </div>
  )
}

/**
 * The help articles Chak's answer names, as badges under his bubble, outside
 * it: only prose goes in a bubble. A badge opens its article underneath, one
 * at a time, with the same disclosure as the trace. Everything comes from this
 * turn's `search_kb` rows, so it needs no request and still opens on a saved
 * conversation. Nothing renders when the answer names no searched article.
 */
export function ArticleSources({ trace, answer }: { trace: TraceEntry[]; answer: string }) {
  // `shown` outlives `open` so a closing panel collapses on its content
  // instead of going blank first.
  const [open, setOpen] = useState<string | null>(null)
  const [shown, setShown] = useState<string | null>(null)
  const panelId = useId()

  const articles = citedArticles(trace, answer)
  if (articles.length === 0) return null
  const shownArticle = articles.find((article) => article.id === shown)

  const toggle = (id: string) => {
    setOpen((current) => (current === id ? null : id))
    setShown(id)
  }

  return (
    <section aria-label="Help articles" className="mt-3">
      <p className="text-[12px] tracking-wide text-ink-3">from the help articles</p>
      <ul className="mt-1.5 flex flex-wrap gap-1.5">
        {articles.map((article) => {
          const isOpen = open === article.id
          return (
            <li key={article.id} className="max-w-full">
              <Badge asChild variant={isOpen ? 'default' : 'outline'}>
                {/* Titles wrap rather than widen a 320px phone. */}
                <button
                  type="button"
                  onClick={() => toggle(article.id)}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  className="h-auto min-h-6 max-w-full cursor-pointer gap-1.5 px-2.5 py-0.5 text-left text-[12.5px] font-normal whitespace-normal outline-none active:translate-y-px pointer-coarse:min-h-11 pointer-coarse:px-4"
                >
                  <BookOpenIcon aria-hidden weight="bold" />
                  <span className="font-medium">{article.title}</span>
                </button>
              </Badge>
            </li>
          )
        })}
      </ul>

      <div className="disclosure" data-state={open !== null ? 'open' : 'closed'}>
        <div>
          {/* inert keeps a closed panel out of the focus order and the
              accessibility tree while the grid row animates to 0fr. */}
          <div
            id={panelId}
            inert={open === null}
            className="mt-2 overflow-hidden rounded-xl border border-rule bg-surface"
          >
            {shownArticle && <ArticlePanel article={shownArticle} />}
          </div>
        </div>
      </div>
    </section>
  )
}
