"use client";

import { Badge } from "@/components/ui/badge";
import { formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface ReverseBudgetMetric {
  label: string;
  value: number;
  compact?: boolean;
  highlight?: boolean;
}

export interface ReverseBudgetOption {
  id: string;
  label: string;
  description: string;
  utilizationPct: number;
  monthlyBudget: number;
  metrics: ReverseBudgetMetric[];
}

interface ReverseBudgetOptionsProps {
  monthlySurplus: number;
  options: ReverseBudgetOption[];
  className?: string;
}

const tierAccent: Record<string, string> = {
  ideal: "border-l-success",
  balanced: "border-l-warning",
  tight: "border-l-destructive",
};

export function ReverseBudgetOptions({
  monthlySurplus,
  options,
  className,
}: ReverseBudgetOptionsProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="border border-border bg-muted px-4 py-3 text-sm">
        <p className="text-muted-foreground">
          Based on your monthly surplus of{" "}
          <span className="font-bold text-foreground tabular-nums">
            {formatINR(monthlySurplus)}
          </span>
          , here are three budgets from comfortable to maximum stretch.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {options.map((option) => (
          <div
            key={option.id}
            className={cn(
              "space-y-3 border border-border border-l-[3px] bg-card p-5",
              tierAccent[option.id] ?? "border-l-border"
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-base font-bold">{option.label}</p>
              <Badge variant="outline" className="shrink-0">
                {option.utilizationPct}% surplus
              </Badge>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {option.description}
            </p>
            <div>
              <p className="np-caps text-muted-foreground">Monthly budget</p>
              <p className="mt-1 text-xl font-extrabold tabular-nums">
                {formatINR(option.monthlyBudget)}
              </p>
            </div>
            {option.metrics.map((metric) => (
              <div key={metric.label}>
                <p className="np-caps text-muted-foreground">{metric.label}</p>
                <p
                  className={cn(
                    "mt-1 tabular-nums",
                    metric.highlight
                      ? "text-2xl font-extrabold tracking-tight"
                      : "text-sm font-bold"
                  )}
                >
                  {formatINR(metric.value, { compact: metric.compact })}
                </p>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
