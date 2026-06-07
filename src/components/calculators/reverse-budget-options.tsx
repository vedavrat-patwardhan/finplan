"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  ideal: "border-success/30 bg-success/5",
  balanced: "border-chart-3/30 bg-chart-3/5",
  tight: "border-destructive/20 bg-destructive/5",
};

export function ReverseBudgetOptions({
  monthlySurplus,
  options,
  className,
}: ReverseBudgetOptionsProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="rounded-xl border border-border bg-muted/20 px-4 py-3 text-sm">
        <p className="text-muted-foreground">
          Based on your monthly surplus of{" "}
          <span className="font-medium text-foreground tabular-nums">
            {formatINR(monthlySurplus)}
          </span>
          , here are three budgets from comfortable to maximum stretch.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {options.map((option) => (
          <Card
            key={option.id}
            className={cn("border", tierAccent[option.id] ?? "border-border")}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="font-heading text-base">{option.label}</CardTitle>
                <span className="shrink-0 rounded-md bg-background/80 px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
                  {option.utilizationPct}% surplus
                </span>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {option.description}
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Monthly budget</p>
                <p className="font-heading text-xl font-semibold tabular-nums">
                  {formatINR(option.monthlyBudget)}
                </p>
              </div>
              {option.metrics.map((metric) => (
                <div key={metric.label}>
                  <p className="text-xs text-muted-foreground">{metric.label}</p>
                  <p
                    className={cn(
                      "tabular-nums",
                      metric.highlight
                        ? "font-heading text-2xl font-semibold"
                        : "text-sm font-medium"
                    )}
                  >
                    {formatINR(metric.value, { compact: metric.compact })}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
