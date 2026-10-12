import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Slot } from "radix-ui"

/*
 * shadcn's Badge (radix-nova), re-tokenized for the page:
 * - `default` is ink, not `bg-primary`: marmalade's jobs are fixed, and a
 *   filled badge is not one of them. Same rule as the Bubble.
 * - `destructive` is crimson on its wash, for a row where the Worker acted
 *   or a judgment was flagged. It always carries the word, never colour alone.
 * - `dark:` variants are dropped; they never fire on this page.
 * `rounded-4xl` is the top of the radius scale, so a badge is a pill.
 */
const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-ink text-paper [a,button]:hover:bg-ink/85",
        secondary:
          "bg-secondary text-secondary-foreground [a,button]:hover:bg-secondary/80",
        destructive:
          "bg-danger-wash text-danger focus-visible:ring-destructive/20 [a,button]:hover:bg-destructive/15",
        outline:
          "border-border bg-surface text-foreground [a,button]:hover:bg-muted",
        ghost: "hover:bg-muted hover:text-muted-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge }
