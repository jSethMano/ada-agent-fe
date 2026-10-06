import { useId, useState } from 'react'
import { CheckIcon, PencilSimpleIcon, XIcon } from '@phosphor-icons/react'
import { ChakSprite } from '@/components/chak-sprite'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import type { ApprovalDecision, PendingApproval, Turn } from '@/lib/api/types'

/** ItAgent's limits, also enforced by the Worker on an edited ticket. */
const TITLE_MAX = 200
const DESCRIPTION_MAX = 4000

/** 16px below sm, or iOS Safari zooms the page when the field takes focus. */
const FIELD =
  'w-full rounded-lg border border-rule bg-paper px-2.5 py-2 text-base leading-relaxed text-ink outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 sm:text-[15px]'

const ACTION = 'font-mono text-[11.5px] pointer-coarse:h-11'

/** The machine facts under the ticket: what triage made of it before anyone
 *  decided. Priority is set in code from Jev's judgments. */
function TriageLine({ approval }: { approval: PendingApproval }) {
  const triage = approval.triage
  const facts: Array<{ text: string; flagged?: boolean }> = []
  if (approval.priority && triage?.category) facts.push({ text: `${approval.priority} · ${triage.category}` })
  else if (approval.priority) facts.push({ text: approval.priority })
  else facts.push({ text: 'untriaged' })
  if (triage?.security_incident) facts.push({ text: 'security incident', flagged: true })
  if (triage?.duplicate_of) facts.push({ text: `possible duplicate of ${triage.duplicate_of}` })
  if (triage?.related_to) facts.push({ text: `related to ${triage.related_to}` })

  return (
    <p className="flex flex-wrap gap-x-3 gap-y-0.5">
      {facts.map((fact) => (
        <code
          key={fact.text}
          className={cn('font-mono text-[11.5px]', fact.flagged ? 'text-danger' : 'text-ink-3')}
        >
          {fact.text}
        </code>
      ))}
    </p>
  )
}

interface ApprovalCardProps {
  turn: Turn & { approval: PendingApproval }
  /** Which decision is in flight for this turn, if any. */
  deciding: ApprovalDecision['action'] | null
  /** Another request is in flight, so nothing can be sent yet. */
  busy: boolean
  onDecide: (decision: Omit<ApprovalDecision, 'id'>) => void
}

/**
 * The pause in the loop: Chak has written a ticket and triage has run, but
 * nothing is filed until the visitor approves it, edits it, or declines it.
 * The decision becomes a `human.approval` row in the trace above.
 */
export function ApprovalCard({ turn, deciding, busy, onDecide }: ApprovalCardProps) {
  const { approval, approvalClosed, approvalError } = turn
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(approval.args.title)
  const [description, setDescription] = useState(approval.args.description)
  const headingId = useId()
  const titleId = useId()
  const descriptionId = useId()

  if (approvalClosed) {
    return (
      <div className="mt-3 max-w-[68ch] border-l-2 border-rule pl-3">
        <p className="font-mono text-[11.5px] text-ink-3">not filed · {approval.args.title}</p>
        <p className="mt-1 text-[13.5px] leading-relaxed text-ink-2">
          {approvalClosed === 'dropped'
            ? 'You sent a new message instead, so this ticket was dropped.'
            : 'This ticket is no longer waiting for approval. It was already decided, or a newer message dropped it.'}
        </p>
      </div>
    )
  }

  const trimmedTitle = title.trim()
  const edited = trimmedTitle !== approval.args.title || description.trim() !== approval.args.description
  const locked = busy || deciding !== null

  const approve = () =>
    onDecide(
      editing && edited
        ? { action: 'approve', args: { title: trimmedTitle, description: description.trim() } }
        : { action: 'approve' },
    )

  const undoEdits = () => {
    setTitle(approval.args.title)
    setDescription(approval.args.description)
    setEditing(false)
  }

  return (
    <section
      aria-labelledby={headingId}
      className="mt-3 max-w-[68ch] border border-rule-strong bg-paper px-3 py-3 sm:px-4"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 id={headingId} className="text-[14px] font-medium text-ink">
          File this ticket?
        </h3>
        <code className="font-mono text-[11px] text-ink-3">waiting for you · {approval.tool}</code>
      </div>

      {editing ? (
        <div className="mt-3 space-y-3">
          <div>
            <label htmlFor={titleId} className="mb-1 block font-mono text-[11px] text-ink-3">
              title
            </label>
            <input
              id={titleId}
              value={title}
              maxLength={TITLE_MAX}
              disabled={locked}
              onChange={(event) => setTitle(event.target.value)}
              className={FIELD}
            />
          </div>
          <div>
            <label htmlFor={descriptionId} className="mb-1 block font-mono text-[11px] text-ink-3">
              description
            </label>
            <Textarea
              id={descriptionId}
              value={description}
              maxLength={DESCRIPTION_MAX}
              disabled={locked}
              onChange={(event) => setDescription(event.target.value)}
              className={cn(FIELD, 'max-h-60 min-h-20 resize-none md:text-[15px]')}
            />
          </div>
          <p className="text-[12.5px] leading-relaxed text-ink-3">
            An edited ticket is triaged again on your wording when you file it.
          </p>
        </div>
      ) : (
        <dl className="mt-3 space-y-2.5">
          <div>
            <dt className="font-mono text-[11px] text-ink-3">title</dt>
            <dd className="mt-0.5 text-[15px] leading-snug text-ink">{approval.args.title}</dd>
          </div>
          {approval.args.description && (
            <div>
              <dt className="font-mono text-[11px] text-ink-3">description</dt>
              <dd className="mt-0.5 text-[14px] leading-relaxed whitespace-pre-wrap text-ink-2">
                {approval.args.description}
              </dd>
            </div>
          )}
        </dl>
      )}

      <div className="mt-3 border-t border-rule pt-2.5">
        <TriageLine approval={approval} />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {/* Ink, not the accent: marmalade's jobs are fixed, and this is not one. */}
        <Button
          variant="outline"
          size="sm"
          onClick={approve}
          disabled={locked || trimmedTitle.length === 0}
          className={cn(ACTION, 'border-ink text-ink')}
        >
          <CheckIcon aria-hidden weight="bold" />
          File ticket
        </Button>
        {editing ? (
          <Button variant="outline" size="sm" onClick={undoEdits} disabled={locked} className={ACTION}>
            Undo edits
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)} disabled={locked} className={ACTION}>
            <PencilSimpleIcon aria-hidden weight="bold" />
            Edit
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onDecide({ action: 'cancel' })}
          disabled={locked}
          className={ACTION}
        >
          <XIcon aria-hidden weight="bold" />
          Don’t file
        </Button>
      </div>

      {deciding ? (
        <div role="status" className="mt-2.5 flex items-center gap-2">
          <ChakSprite thinking size={16} />
          <span className="font-mono text-[11.5px] text-ink-3">
            {deciding === 'approve' ? 'filing' : 'not filing'}
          </span>
        </div>
      ) : approvalError ? (
        <p role="alert" className="mt-2.5 text-[13px] leading-relaxed text-danger">
          {approvalError}
        </p>
      ) : (
        <p className="mt-2.5 text-[12.5px] leading-relaxed text-ink-3">
          Nothing is filed until you choose. Sending a new message instead drops this ticket.
        </p>
      )}
    </section>
  )
}
