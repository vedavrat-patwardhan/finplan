"use client";

import { cn } from "@/lib/utils";

// Tailwind's static scanner needs literal class names — never build these at
// runtime from the `name` string.
const SWATCHES = [
  { name: "background", cls: "bg-background" },
  { name: "card", cls: "bg-card" },
  { name: "muted", cls: "bg-muted" },
  { name: "foreground", cls: "bg-foreground" },
  { name: "brand", cls: "bg-brand" },
  { name: "success", cls: "bg-success" },
  { name: "warning", cls: "bg-warning" },
  { name: "destructive", cls: "bg-destructive" },
  { name: "info", cls: "bg-info" },
  { name: "chart-1", cls: "bg-chart-1" },
  { name: "chart-2", cls: "bg-chart-2" },
  { name: "chart-3", cls: "bg-chart-3" },
  { name: "chart-4", cls: "bg-chart-4" },
  { name: "chart-5", cls: "bg-chart-5" },
  { name: "chart-6", cls: "bg-chart-6" },
  { name: "chart-7", cls: "bg-chart-7" },
  { name: "chart-8", cls: "bg-chart-8" },
] as const;

const OPACITY_TIERS = [
  { cls: "text-foreground", label: "text-foreground · 90%" },
  { cls: "text-subtle", label: "text-subtle · 70%" },
  { cls: "text-muted-foreground", label: "text-muted-foreground · 50%" },
  { cls: "text-faint", label: "text-faint · 30%" },
] as const;

export function ColorSwatches() {
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-x-5 gap-y-4">
        {SWATCHES.map((swatch) => (
          <div key={swatch.name} className="w-24 space-y-1.5">
            <div className={cn("size-16 border border-border", swatch.cls)} />
            <p className="np-caps text-[9px] tracking-[1px] text-muted-foreground">
              {swatch.name}
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-8 border-t border-border pt-6">
        {OPACITY_TIERS.map((tier) => (
          <div key={tier.cls} className="space-y-1.5">
            <p className={cn("text-lg font-bold", tier.cls)}>Aa 123</p>
            <p className="np-caps text-[9px] text-muted-foreground">{tier.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
