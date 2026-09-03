"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChartArea } from "@/components/ui/chart-area";
import { ColoredBarRectangle } from "@/components/finance/chart-shapes";
import { formatINR, formatPercent } from "@/lib/format";
import type { PortfolioReturnSummary } from "@/lib/finance/investment-metrics";
import { useChartPalette } from "@/lib/finance/use-chart-palette";
import { cn } from "@/lib/utils";

interface PortfolioReturnsPanelProps {
  summary: PortfolioReturnSummary;
  byInvestment: Array<{
    name: string;
    invested: number;
    fundValue: number;
    absoluteReturnPct: number | null;
  }>;
}

const axisTick = { fill: "var(--muted-foreground)", fontSize: 10 };

function ReturnsTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number }>;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="border border-border bg-popover p-3">
      {payload.map((item) => (
        <p key={item.name} className="flex items-baseline justify-between gap-4">
          <span className="np-caps text-muted-foreground">{item.name}</span>
          <span className="font-bold tabular-nums">
            {formatINR(item.value, { compact: true })}
          </span>
        </p>
      ))}
    </div>
  );
}

export function PortfolioReturnsPanel({ summary, byInvestment }: PortfolioReturnsPanelProps) {
  const { colorAt } = useChartPalette();
  const chartData = byInvestment
    .filter((item) => item.invested > 0)
    .map((item, i) => ({
      name: item.name,
      invested: item.invested,
      fundValue: item.fundValue,
      color: colorAt(i),
      fill: colorAt(i),
    }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Portfolio returns</CardTitle>
        <CardDescription>
          Historical performance from invested amounts and current fund values across your
          holdings.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Total invested" value={formatINR(summary.totalInvested, { compact: true })} />
          <Stat label="Current value" value={formatINR(summary.totalFundValue, { compact: true })} />
          <Stat
            label="Absolute return"
            value={formatPercent(summary.absoluteReturnPct)}
            tone={summary.gainAmount >= 0 ? "positive" : "negative"}
          />
          <Stat
            label="Annualized (est.)"
            value={
              summary.annualizedReturnPct != null
                ? formatPercent(summary.annualizedReturnPct)
                : "Add fund values"
            }
            muted={summary.annualizedReturnPct == null}
          />
        </div>

        {summary.itemsWithReturns < summary.totalItems ? (
          <p className="text-xs text-muted-foreground">
            {summary.totalItems - summary.itemsWithReturns} holding
            {summary.totalItems - summary.itemsWithReturns === 1 ? "" : "s"} missing return or
            current value — add them on each investment card for a complete picture.
          </p>
        ) : null}

        {chartData.length > 0 ? (
          <ChartArea className="h-64">
            <BarChart data={chartData} margin={{ bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
              <XAxis
                dataKey="name"
                tick={axisTick}
                interval={0}
                angle={-15}
                textAnchor="end"
                height={50}
              />
              <YAxis tickFormatter={(v) => formatINR(v, { compact: true })} tick={axisTick} />
              <Tooltip content={<ReturnsTooltip />} />
              <Bar dataKey="invested" name="Invested" radius={0} shape={ColoredBarRectangle} />
              <Bar
                dataKey="fundValue"
                name="Fund value"
                radius={0}
                shape={(props) => <ColoredBarRectangle {...props} fillKey="fill" opacity={0.65} />}
              />
            </BarChart>
          </ChartArea>
        ) : null}
      </CardContent>
    </Card>
  );
}

function Stat({
  label,
  value,
  tone,
  muted,
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative";
  muted?: boolean;
}) {
  return (
    <div className="border border-border bg-muted px-4 py-3">
      <p className="np-caps text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 text-xl font-extrabold tabular-nums tracking-tight",
          muted
            ? "text-muted-foreground"
            : tone === "positive"
              ? "text-success-text"
              : tone === "negative"
                ? "text-destructive"
                : ""
        )}
      >
        {value}
      </p>
    </div>
  );
}
