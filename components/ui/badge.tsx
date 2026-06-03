import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap [&_svg]:pointer-events-none [&_svg]:size-3",
  {
    variants: {
      variant: {
        default: "bg-muted text-muted-foreground ring-1 ring-inset ring-border",
        success:
          "bg-income/10 text-income ring-1 ring-inset ring-income/20",
        danger:
          "bg-expense/10 text-expense ring-1 ring-inset ring-expense/20",
        warning:
          "bg-warning/10 text-warning ring-1 ring-inset ring-warning/25",
        info: "bg-info/10 text-info ring-1 ring-inset ring-info/20",
        outline: "border border-border text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant, className }))}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
