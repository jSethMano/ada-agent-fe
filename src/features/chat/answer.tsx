import { Fragment, type ReactNode } from 'react'
import { Bubble, BubbleContent, BubbleTail } from '@/components/ui/bubble'

/**
 * Minimal renderer for the small amount of Markdown the model actually emits.
 *
 * Llama returns plain prose most of the time, but it intermittently produces
 * `[label](mailto:...)`, `**bold**`, or backtick spans. Rendered as raw text
 * those read as broken output, which is the last thing this page should show.
 *
 * This is deliberately not a Markdown library. It builds React elements rather
 * than HTML, so there is no injection surface, and it covers only the inline
 * constructs observed from this model. Anything else falls through as text.
 */

const INLINE = /(\*\*[^*\n]+\*\*|`[^`\n]+`|\[[^\]\n]+\]\([^)\s]+\))/g

const SAFE_PROTOCOL = /^(https?:|mailto:)/i

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  return text.split(INLINE).map((token, index) => {
    const key = `${keyPrefix}-${index}`

    if (token.startsWith('**') && token.endsWith('**')) {
      return (
        <strong key={key} className="font-semibold text-ink">
          {token.slice(2, -2)}
        </strong>
      )
    }

    if (token.startsWith('`') && token.endsWith('`')) {
      return (
        <code key={key} className="rounded-sm bg-paper px-1 py-0.5 font-mono text-[0.85em] text-ink">
          {token.slice(1, -1)}
        </code>
      )
    }

    const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(token)
    if (link) {
      const [, label, href] = link
      // Never render a link the model invented with an unexpected scheme.
      if (!SAFE_PROTOCOL.test(href)) return <Fragment key={key}>{label}</Fragment>
      return (
        <a
          key={key}
          href={href}
          target="_blank"
          rel="noreferrer"
          className="text-accent-ink underline underline-offset-2"
        >
          {label}
        </a>
      )
    }

    return <Fragment key={key}>{token}</Fragment>
  })
}

/** Chak's answer, in his bubble on the left. Muted, not ink: the ink bubble is
 *  the visitor's. */
export function Answer({ text }: { text: string }) {
  const paragraphs = text.trim().split(/\n{2,}/)

  return (
    // Capped so prose stays readable even where the chat column is wide.
    <Bubble variant="muted" className="mt-3 max-w-[min(92%,68ch)]">
      {/* Same size and padding as the visitor's bubble, so a thread reads as
          one conversation and both tails sit level with the first line. */}
      <BubbleTail />
      <BubbleContent className="space-y-3 px-3.5 py-2 text-[15px] leading-relaxed text-ink">
        {paragraphs.map((paragraph, pIndex) => (
          <p key={pIndex}>
            {paragraph.split('\n').map((line, lIndex) => (
              <Fragment key={lIndex}>
                {lIndex > 0 && <br />}
                {renderInline(line, `${pIndex}-${lIndex}`)}
              </Fragment>
            ))}
          </p>
        ))}
      </BubbleContent>
    </Bubble>
  )
}
