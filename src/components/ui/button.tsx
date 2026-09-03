import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap select-none uppercase font-bold tracking-[0.14em] leading-none outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground np-plunk np-plunk-press np-edge-dark dark:np-edge-light",
        secondary:
          "bg-secondary text-secondary-foreground border border-input np-plunk np-plunk-press",
        brand: "bg-brand text-brand-foreground np-plunk np-plunk-press np-edge-brand",
        destructive:
          "bg-destructive text-destructive-foreground np-plunk np-plunk-press np-edge-danger",
        outline:
          "border border-foreground/30 bg-transparent hover:border-foreground np-press aria-expanded:border-foreground aria-expanded:bg-accent",
        ghost: "hover:bg-accent np-press aria-expanded:bg-accent",
        link: "h-auto p-0 border-b border-current normal-case tracking-normal font-semibold text-sm",
      },
      size: {
        default:
          "h-10 gap-2 px-5 text-xs has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",
        xs: "h-7 gap-1.5 px-3 text-[10px] tracking-[1.5px] has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5 [&_svg]:size-3.5",
        sm: "h-8 gap-1.5 px-4 text-[11px] has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        lg: "h-12 gap-2 px-8 text-[13px] has-data-[icon=inline-end]:pr-6 has-data-[icon=inline-start]:pl-6",
        icon: "size-10",
        "icon-xs": "size-7 [&_svg]:size-3.5",
        "icon-sm": "size-8",
        "icon-lg": "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
