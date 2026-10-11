import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Slot } from "radix-ui"

/*
 * shadcn's Bubble (radix-nova), re-tokenized for the page locks:
 * - `default` is ink, not `bg-primary`. Primary is marmalade, whose four jobs
 *   are fixed, so a filled bubble may never be the accent. `tinted`, a wash
 *   of primary, is left out for the same reason, and so are the `dark:`
 *   variants, which never fire on this page.
 * - BubbleReactions is left out: it is a pill (`rounded-full`), and nothing
 *   here takes reactions.
 * - BubbleTail is added: the callout tail, a rotated square half outside
 *   the bubble, so a message reads as speech.
 * Every `rounded-*` resolves to the 2px `--radius`, so bubbles are square.
 */

function BubbleGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="bubble-group"
      className={cn("flex min-w-0 flex-col gap-2", className)}
      {...props}
    />
  )
}

const bubbleVariants = cva(
  "group/bubble relative flex w-fit max-w-[80%] min-w-0 flex-col gap-1 group-data-[align=end]/message:self-end data-[align=end]:self-end data-[variant=ghost]:max-w-full",
  {
    variants: {
      variant: {
        default:
          "*:data-[slot=bubble-content]:bg-ink *:data-[slot=bubble-content]:text-paper",
        secondary:
          "*:data-[slot=bubble-content]:bg-secondary *:data-[slot=bubble-content]:text-secondary-foreground [&>[data-slot=bubble-content]:is(button,a):hover]:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)]",
        muted:
          "*:data-[slot=bubble-content]:bg-muted [&>[data-slot=bubble-content]:is(button,a):hover]:bg-[color-mix(in_oklch,var(--muted),var(--foreground)_5%)]",
        outline:
          "*:data-[slot=bubble-content]:border-border *:data-[slot=bubble-content]:bg-background [&>[data-slot=bubble-content]:is(button,a):hover]:bg-muted [&>[data-slot=bubble-content]:is(button,a):hover]:text-foreground",
        ghost:
          "border-none *:data-[slot=bubble-content]:rounded-none *:data-[slot=bubble-content]:bg-transparent *:data-[slot=bubble-content]:p-0 [&>[data-slot=bubble-content]:is(button,a):hover]:bg-muted [&>[data-slot=bubble-content]:is(button,a):hover]:text-foreground",
        destructive:
          "*:data-[slot=bubble-content]:bg-destructive/10 *:data-[slot=bubble-content]:text-destructive [&>[data-slot=bubble-content]:is(button,a):hover]:bg-destructive/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Bubble({
  variant = "default",
  align = "start",
  className,
  ...props
}: React.ComponentProps<"div"> &
  VariantProps<typeof bubbleVariants> & {
    align?: "start" | "end"
  }) {
  return (
    <div
      data-slot="bubble"
      data-variant={variant}
      data-align={align}
      className={cn(bubbleVariants({ variant }), className)}
      {...props}
    />
  )
}

function BubbleContent({
  asChild = false,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  asChild?: boolean
}) {
  const Comp = asChild ? Slot.Root : "div"

  return (
    <Comp
      data-slot="bubble-content"
      className={cn(
        "w-fit max-w-full min-w-0 overflow-hidden rounded-xl border border-transparent px-3 py-2 text-sm leading-relaxed wrap-break-word group-data-[align=end]/bubble:self-end [button]:text-left [button,a]:transition-colors [button,a]:outline-none [button,a]:focus-visible:border-ring [button,a]:focus-visible:ring-3 [button,a]:focus-visible:ring-ring/50",
        className
      )}
      {...props}
    />
  )
}

/** The tail: a rotated square half outside the bubble, on the speaker's side,
 *  level with the first line. A sibling of BubbleContent, not a child, because
 *  the content clips its overflow. Ghost and destructive bubbles have none. */
function BubbleTail({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      aria-hidden
      data-slot="bubble-tail"
      className={cn(
        "pointer-events-none absolute top-4 size-2 rotate-45 border-transparent",
        "group-data-[align=start]/bubble:-left-[4px] group-data-[align=end]/bubble:-right-[4px]",
        "group-data-[variant=default]/bubble:bg-ink group-data-[variant=secondary]/bubble:bg-secondary group-data-[variant=muted]/bubble:bg-muted",
        "group-data-[variant=outline]/bubble:border-border group-data-[variant=outline]/bubble:bg-background group-data-[align=start]/bubble:border-b group-data-[align=start]/bubble:border-l group-data-[align=end]/bubble:border-t group-data-[align=end]/bubble:border-r",
        "group-data-[variant=destructive]/bubble:hidden group-data-[variant=ghost]/bubble:hidden",
        className
      )}
      {...props}
    />
  )
}

export { BubbleGroup, Bubble, BubbleContent, BubbleTail }
