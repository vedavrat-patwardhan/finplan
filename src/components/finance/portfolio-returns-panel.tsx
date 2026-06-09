"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartArea } from "@/components/ui/chart-area";
import { ColoredBarRectangle } from "@/components/finance/chart-shapes";
import { formatINR, formatPercent } from "@/lib/format";
import type { PortfolioReturnSummary } from "@/lib/finance/investment-metrics";
import { chartColorAt } from "@/lib/finance/chart-colors";

interface PortfolioReturnsPanelProps {
  summary: PortfolioReturnSummary;
  byInvestment: Array<{
    name: string;
    invested: number;
    fundValue: number;
    absoluteReturnPct: number | null;
  }>;
}

function ReturnsTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number }>;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-sm shadow-md">
      {payload.map((item) => (
        <p key={item.name} className="tabular-nums">
          <span className="text-muted-foreground">{item.name}: </span>
          {formatINR(item.value, { compact: true })}
        </p>
      ))}
    </div>
  );
}

export function PortfolioReturnsPanel({ summary, byInvestment }: PortfolioReturnsPanelProps) {
  const chartData = byInvestment
    .filter((item) => item.invested > 0)
    .map((item, i) => ({
      name: item.name,
      invested: item.invested,
      fundValue: item.fundValue,
      color: chartColorAt(i),
      fill: chartColorAt(i),
    }));

  return (
    <Card className="overflow-hidden border-t-[3px] border-t-chart-1">
      <CardHeader>
        <CardTitle className="font-heading text-lg">Portfolio returns</CardTitle>
        <p className="text-sm text-muted-foreground">
          Historical performance from invested amounts and current fund values across your holdings.
        </p>
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
              <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={50} />
              <YAxis tickFormatter={(v) => formatINR(v, { compact: true })} tick={{ fontSize: 10 }} />
              <Tooltip content={<ReturnsTooltip />} />
              <Bar dataKey="invested" name="Invested" radius={[4, 4, 0, 0]} shape={ColoredBarRectangle} />
              <Bar
                dataKey="fundValue"
                name="Fund value"
                radius={[4, 4, 0, 0]}
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
    <div className="rounded-lg bg-muted/40 px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={`mt-0.5 font-heading text-lg font-semibold tabular-nums ${
          muted
            ? "text-muted-foreground"
            : tone === "positive"
              ? "text-success"
              : tone === "negative"
                ? "text-destructive"
                : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}
