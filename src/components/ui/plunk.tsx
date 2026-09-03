import * as React from "react"

import { cn } from "@/lib/utils"

type PlunkEdge = "light" | "dark" | "brand" | "danger" | "success" | "muted"
type PlunkSize = "md" | "lg"

interface PlunkClassOptions {
  size?: PlunkSize
  edge?: PlunkEdge
  press?: boolean
}

// Keep every value a literal class string so Tailwind's static scanner can
// find it — building "np-edge-" + edge at runtime would not be detected.
const EDGE_CLASSES: Record<PlunkEdge, string> = {
  light: "np-edge-light",
  dark: "np-edge-dark",
  brand: "np-edge-brand",
  danger: "np-edge-danger",
  success: "np-edge-success",
  muted: "np-edge-muted",
}

function plunkClass({ size = "md", edge, press = false }: PlunkClassOptions = {}) {
  return cn(
    "np-plunk",
    size === "lg" && "np-plunk-lg",
    press && "np-plunk-press",
    edge && EDGE_CLASSES[edge]
  )
}

interface PlunkProps
  extends Omit<React.ComponentPropsWithoutRef<"div">, keyof PlunkClassOptions>,
    PlunkClassOptions {
  as?: React.ElementType
}

function Plunk({
  as: Component = "div",
  size = "md",
  edge,
  press = false,
  className,
  ...props
}: PlunkProps) {
  return (
    <Component
      data-slot="plunk"
      className={cn(plunkClass({ size, edge, press }), "border border-border bg-card", className)}
      {...props}
    />
  )
}

export { Plunk, plunkClass }
export type { PlunkEdge, PlunkSize }
