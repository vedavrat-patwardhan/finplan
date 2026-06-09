"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartArea } from "@/components/ui/chart-area";
import { formatINR, formatPercent } from "@/lib/format";
import {
  generateHorizonProjectionSeries,
  projectPortfolioAtYears,
} from "@/lib/finance/engine";
import { chartColorAt } from "@/lib/finance/chart-colors";

export interface FuturePredictionInputs {
  currentPortfolioValue: number;
  monthlyInvestments: number;
  expectedReturnPct: number;
  currentReturnPct: number;
  inflationRate: number;
}

function ProjectionTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-sm shadow-md">
      {label ? <p className="mb-1 font-medium">{label}</p> : null}
      {payload.map((item) => (
        <p key={item.name} className="tabular-nums">
          <span className="text-muted-foreground">{item.name}: </span>
          {formatINR(item.value, { compact: true })}
        </p>
      ))}
    </div>
  );
}

function ScenarioCard({
  title,
  subtitle,
  projection,
  accentClass,
}: {
  title: string;
  subtitle: string;
  projection: ReturnType<typeof projectPortfolioAtYears>;
  accentClass: string;
}) {
  return (
    <div className={`rounded-xl border border-border px-4 py-4 ${accentClass}`}>
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs text-muted-foreground">{subtitle}</p>
      <p className="font-heading mt-3 text-2xl font-semibold tabular-nums">
        {formatINR(projection.futureValue, { compact: true })}
      </p>
      <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <p className="text-xs text-muted-foreground">Investment gain</p>
          <p
            className={`font-medium tabular-nums ${
              projection.gain >= 0 ? "text-success" : "text-destructive"
            }`}
          >
            {projection.gain >= 0 ? "+" : ""}
            {formatINR(projection.gain, { compact: true })}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Return on basis</p>
          <p className="font-medium tabular-nums">
            {formatPercent(projection.absoluteReturnPct)}
          </p>
        </div>
      </div>
    </div>
  );
}

export function FuturePredictionPanel({
  inputs,
}: {
  inputs: FuturePredictionInputs;
}) {
  const [years, setYears] = useState(10);

  const series = useMemo(
    () =>
      generateHorizonProjectionSeries({
        currentPortfolioValue: inputs.currentPortfolioValue,
        monthlyInvestments: inputs.monthlyInvestments,
        expectedReturnPct: inputs.expectedReturnPct,
        currentReturnPct: inputs.currentReturnPct,
        inflationRate: inputs.inflationRate,
      }),
    [inputs]
  );

  const expectedAtHorizon = useMemo(
    () =>
      projectPortfolioAtYears({
        currentPortfolioValue: inputs.currentPortfolioValue,
        monthlyInvestments: inputs.monthlyInvestments,
        annualReturnPct: inputs.expectedReturnPct,
        years,
        inflationRate: inputs.inflationRate,
      }),
    [inputs, years]
  );

  const currentAtHorizon = useMemo(
    () =>
      projectPortfolioAtYears({
        currentPortfolioValue: inputs.currentPortfolioValue,
        monthlyInvestments: inputs.monthlyInvestments,
        annualReturnPct: inputs.currentReturnPct,
        years,
        inflationRate: inputs.inflationRate,
      }),
    [inputs, years]
  );

  const chartData = series.map((point) => ({
    year: point.year,
    expected: Math.round(point.expected),
    current: Math.round(point.current),
  }));

  const expectedColor = chartColorAt(0);
  const currentColor = chartColorAt(2);
  const yearLabel = years === 1 ? "1 year" : `${years} years`;

  return (
    <Card className="overflow-hidden border-t-[3px] border-t-chart-5">
      <CardHeader>
        <CardTitle className="font-heading text-lg">Portfolio outlook</CardTitle>
        <p className="text-sm text-muted-foreground">
          Project portfolio growth using expected returns from your plan vs your current actual
          returns. Monthly SIP of{" "}
          <span className="font-medium tabular-nums text-foreground">
            {formatINR(inputs.monthlyInvestments, { compact: true })}
          </span>{" "}
          is assumed to continue.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Time horizon</p>
              <p className="font-heading text-2xl font-semibold tabular-nums">{yearLabel}</p>
            </div>
            <p className="text-right text-xs text-muted-foreground">
              Inflation assumption: {formatPercent(inputs.inflationRate)} p.a.
            </p>
          </div>
          <input
            type="range"
            min={1}
            max={50}
            step={1}
            value={years}
            onChange={(e) => setYears(Number(e.target.value))}
            className="h-2 w-full cursor-pointer accent-primary"
            aria-label="Projection time horizon in years"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>1 yr</span>
            <span>25 yrs</span>
            <span>50 yrs</span>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <ScenarioCard
            title="Expected returns"
            subtitle={`${formatPercent(inputs.expectedReturnPct)} p.a. from your investment plan`}
            projection={expectedAtHorizon}
            accentClass="border-l-[3px] border-l-chart-1 bg-chart-1/5"
          />
          <ScenarioCard
            title="Current returns"
            subtitle={`${formatPercent(inputs.currentReturnPct)} p.a. based on actual portfolio performance`}
            projection={currentAtHorizon}
            accentClass="border-l-[3px] border-l-chart-2 bg-chart-2/5"
          />
        </div>

        <div className="rounded-xl border border-border bg-muted/30 px-4 py-4">
          <p className="text-sm font-medium">Purchasing power in today&apos;s terms</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Future amounts feel larger, but inflation erodes what they can buy. At{" "}
            {formatPercent(inputs.inflationRate)} inflation, this is what each projection is worth
            in today&apos;s money.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <InflationStat
              label="Expected path"
              futureValue={expectedAtHorizon.futureValue}
              todayValue={expectedAtHorizon.inflationAdjustedValue}
              years={years}
            />
            <InflationStat
              label="Current returns path"
              futureValue={currentAtHorizon.futureValue}
              todayValue={currentAtHorizon.inflationAdjustedValue}
              years={years}
            />
          </div>
        </div>

        <ChartArea className="h-64">
          <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
            <XAxis
              dataKey="year"
              tick={{ fontSize: 10 }}
              tickFormatter={(v) => `${v}y`}
              interval="preserveStartEnd"
            />
            <YAxis
              tickFormatter={(v) => formatINR(v, { compact: true })}
              tick={{ fontSize: 10 }}
              width={52}
            />
            <Tooltip
              content={
                <ProjectionTooltip label={`Year ${years}`} />
              }
            />
            <ReferenceLine x={years} stroke="var(--muted-foreground)" strokeDasharray="4 4" />
            <Line
              type="monotone"
              dataKey="expected"
              name="Expected"
              stroke={expectedColor}
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="current"
              name="Current returns"
              stroke={currentColor}
              strokeWidth={2}
              dot={false}
              strokeDasharray="5 3"
            />
          </LineChart>
        </ChartArea>
      </CardContent>
    </Card>
  );
}

function InflationStat({
  label,
  futureValue,
  todayValue,
  years,
}: {
  label: string;
  futureValue: number;
  todayValue: number;
  years: number;
}) {
  const erosionPct =
    futureValue > 0 ? ((futureValue - todayValue) / futureValue) * 100 : 0;

  return (
    <div className="rounded-lg bg-background/80 px-3 py-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm tabular-nums">
        <span className="font-medium">{formatINR(futureValue, { compact: true })}</span>
        <span className="text-muted-foreground"> in {years} yr → </span>
        <span className="font-medium text-foreground">
          {formatINR(todayValue, { compact: true })} today
        </span>
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        ~{formatPercent(erosionPct)} less buying power than the headline number suggests
      </p>
    </div>
  );
}
