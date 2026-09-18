import { Fragment, type ReactNode } from 'react'

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
        <strong key={key} className="font-medium text-ink">
          {token.slice(2, -2)}
        </strong>
      )
    }

    if (token.startsWith('`') && token.endsWith('`')) {
      return (
        <code key={key} className="bg-paper px-1 py-0.5 font-mono text-[0.85em] text-ink">
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

export function Answer({ text }: { text: string }) {
  const paragraphs = text.trim().split(/\n{2,}/)

  return (
    <div className="mt-3 space-y-3 font-serif text-[17px] leading-[1.6] text-ink">
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
    </div>
  )
}
