"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartArea } from "@/components/ui/chart-area";
import { formatINR } from "@/lib/format";
import type { FutureProjectionPoint } from "@/lib/finance/engine";
import { chartColorAt } from "@/lib/finance/chart-colors";

function ProjectionTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
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

export function FuturePredictionPanel({
  projection,
  monthlySurplus,
}: {
  projection: FutureProjectionPoint[];
  monthlySurplus: number;
}) {
  if (projection.length === 0) return null;

  const last = projection[projection.length - 1];
  const portfolioColor = chartColorAt(0);
  const surplusColor = chartColorAt(3);

  const chartData = projection.map((p) => ({
    label: p.label,
    portfolio: Math.round(p.projectedPortfolio),
    saved: Math.round(p.cumulativeSurplus),
  }));

  return (
    <Card className="overflow-hidden border-t-[3px] border-t-chart-5">
      <CardHeader>
        <CardTitle className="font-heading text-lg">12-month outlook</CardTitle>
        <p className="text-sm text-muted-foreground">
          Based on your current{" "}
          <span className="font-medium tabular-nums text-foreground">
            {formatINR(monthlySurplus, { compact: true })}/mo
          </span>{" "}
          surplus and investment contributions — assumes steady income and spending.
        </p>
      </CardHeader>
      <CardContent>
        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg bg-muted/40 px-4 py-3">
            <p className="text-xs text-muted-foreground">Projected portfolio</p>
            <p className="font-heading mt-0.5 text-xl font-semibold tabular-nums">
              {formatINR(last.projectedPortfolio, { compact: true })}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">in 12 months</p>
          </div>
          <div className="rounded-lg bg-muted/40 px-4 py-3">
            <p className="text-xs text-muted-foreground">Surplus saved</p>
            <p className="font-heading mt-0.5 text-xl font-semibold tabular-nums">
              {formatINR(last.cumulativeSurplus, { compact: true })}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">if surplus holds</p>
          </div>
        </div>

        <ChartArea className="h-56">
          <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
            <YAxis
              tickFormatter={(v) => formatINR(v, { compact: true })}
              tick={{ fontSize: 10 }}
              width={48}
            />
            <Tooltip content={<ProjectionTooltip />} />
            <Line
              type="monotone"
              dataKey="portfolio"
              name="Portfolio"
              stroke={portfolioColor}
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="saved"
              name="Surplus saved"
              stroke={surplusColor}
              strokeWidth={2}
              dot={false}
              strokeDasharray="4 4"
            />
          </LineChart>
        </ChartArea>
      </CardContent>
    </Card>
  );
}
