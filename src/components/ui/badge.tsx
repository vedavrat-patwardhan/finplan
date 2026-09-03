import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex h-[22px] w-fit shrink-0 items-center justify-center gap-1 border border-transparent px-2.5 np-caps text-[10px] tracking-[1.5px] whitespace-nowrap outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 aria-invalid:border-destructive [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-foreground text-background [a]:hover:bg-foreground/80",
        secondary: "bg-muted text-foreground [a]:hover:bg-muted/70",
        outline: "border-border text-foreground [a]:hover:bg-accent",
        brand: "bg-brand text-brand-foreground [a]:hover:bg-brand/80",
        success:
          "bg-success/10 text-success-text dark:bg-success dark:text-success-foreground",
        warning:
          "bg-warning/10 text-warning-text dark:bg-warning dark:text-warning-foreground",
        destructive:
          "bg-destructive/10 text-destructive dark:bg-destructive dark:text-destructive-foreground",
        info: "bg-info/10 text-info-text dark:bg-info dark:text-info-foreground",
        ghost: "text-muted-foreground [a]:hover:bg-accent [a]:hover:text-foreground",
        link: "h-auto border-transparent p-0 normal-case tracking-normal font-semibold text-foreground underline underline-offset-4 [a]:hover:no-underline",
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
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }
