import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-24 w-full bg-input-bg border border-input px-3 py-2.5 text-base font-semibold outline-none transition-colors placeholder:text-faint placeholder:font-medium focus-visible:border-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive md:text-[15px]",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
