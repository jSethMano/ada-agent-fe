/**
 * A title set like a highlighter pass: marmalade on its own wash (5.1:1).
 * Inline, with the box cloned onto every line, so a title that wraps on a
 * phone gets a highlight per line rather than one block. Section titles and
 * the hero heading only: it is marmalade's fifth job, and it never sits on a
 * link, so a title is not mistaken for one.
 */
export function Highlight({ children }: { children: React.ReactNode }) {
  return <span className="box-decoration-clone rounded-md bg-accent-wash px-1 text-accent-ink">{children}</span>
}
