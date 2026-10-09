/** A fixed line from the Worker, shown verbatim. Today it is only the advice to
 *  change a password or key the visitor pasted, so it reads as a warning. It
 *  is display only: it never changes what was filed. */
export function Notice({ text }: { text: string }) {
  return (
    <p
      role="note"
      className="mt-3 max-w-[68ch] border-l-2 border-danger pl-3 text-[13.5px] leading-relaxed text-danger"
    >
      {text}
    </p>
  )
}
