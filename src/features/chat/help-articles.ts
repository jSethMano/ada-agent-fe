import { isToolCall, type KbArticle, type TraceEntry } from '@/lib/api/types'

/** An article's sections in order, with the headings the articles use.
 *  Mirrored from KB_SECTIONS in ada-agent/src/kb.ts. */
export const KB_SECTIONS = [
  { heading: 'Summary', field: 'summary' },
  { heading: 'Steps', field: 'steps' },
  { heading: "If that didn't work", field: 'if_not' },
  { heading: 'When to file a ticket', field: 'file_ticket_when' },
] as const

function asArticle(value: unknown): KbArticle | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const item = value as Record<string, unknown>
  if (typeof item.id !== 'string' || typeof item.title !== 'string' || item.title.trim() === '') return null
  const article: KbArticle = { id: item.id, title: item.title }
  if (typeof item.score === 'number') article.score = item.score
  for (const { field } of KB_SECTIONS) {
    const text = item[field]
    if (typeof text === 'string') article[field] = text
  }
  return article
}

/** Every article this turn's searches returned, once each, in the order they
 *  came back. A malformed article is dropped on its own, the way
 *  `normalizeTrace()` drops a row, so one bad entry never hides the rest. */
export function searchedArticles(trace: TraceEntry[]): KbArticle[] {
  const byId = new Map<string, KbArticle>()
  for (const entry of trace) {
    if (!isToolCall(entry) || entry.tool !== 'search_kb') continue
    // The tool row keeps the raw envelope, `{ result: { found, articles } }`.
    const envelope = entry.result
    const result =
      envelope && typeof envelope === 'object' && 'result' in envelope
        ? (envelope as { result: unknown }).result
        : envelope
    const articles = result && typeof result === 'object' ? (result as { articles?: unknown }).articles : undefined
    if (!Array.isArray(articles)) continue
    for (const value of articles) {
      const article = asArticle(value)
      if (article && !byId.has(article.id)) byId.set(article.id, article)
    }
  }
  return [...byId.values()]
}

/** Case, curly quotes, and runs of space, folded, so a title the model wrote
 *  in its own punctuation still matches. */
function fold(text: string): string {
  return text.toLowerCase().replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ')
}

/** The searched articles the answer names by title, in the order it names
 *  them. An article the search returned but the answer never mentions stays
 *  in the trace only, so a badge never claims he used an article he didn't.
 *  A paraphrased title gets no badge for the same reason. */
export function citedArticles(trace: TraceEntry[], answer: string): KbArticle[] {
  const text = fold(answer)
  return searchedArticles(trace)
    .map((article) => ({ article, at: text.indexOf(fold(article.title.trim())) }))
    .filter(({ at }) => at >= 0)
    .sort((a, b) => a.at - b.at)
    .map(({ article }) => article)
}
