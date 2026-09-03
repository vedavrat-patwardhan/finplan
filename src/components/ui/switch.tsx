"use client"

import * as React from "react"
import { Switch as SwitchPrimitive } from "@base-ui/react/switch"

import { cn } from "@/lib/utils"

function Switch({ className, ...props }: SwitchPrimitive.Root.Props) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "relative inline-flex h-[22px] w-10 shrink-0 items-center border border-foreground bg-background outline-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50 data-checked:bg-[#B4EDD4] dark:data-checked:bg-[#B4EDD4]",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="relative size-5 shrink-0 border border-background bg-[#E0E0E0] transition-transform after:absolute after:top-1/2 after:left-1/2 after:size-2 after:-translate-x-1/2 after:-translate-y-1/2 after:bg-background after:transition-colors data-checked:translate-x-[18px] data-checked:bg-[#38b36f] data-checked:after:bg-white"
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
