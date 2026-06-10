"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatINR, formatPercent } from "@/lib/format";
import {
  projectPortfolioAtYears,
  type PortfolioHorizonProjection,
} from "@/lib/finance/engine";
import { cn } from "@/lib/utils";

export interface FuturePredictionInputs {
  currentPortfolioValue: number;
  monthlyInvestments: number;
  expectedReturnPct: number;
  currentReturnPct: number;
  inflationRate: number;
}

function ProjectionBreakdown({
  title,
  subtitle,
  projection,
  years,
  accentClass,
}: {
  title: string;
  subtitle: string;
  projection: PortfolioHorizonProjection;
  years: number;
  accentClass: string;
}) {
  const invested = projection.startingValue + projection.newContributions;

  return (
    <div className={cn("rounded-xl border border-border px-4 py-4", accentClass)}>
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs text-muted-foreground">{subtitle}</p>

      <p className="font-heading mt-4 text-2xl font-semibold tabular-nums">
        {formatINR(projection.futureValue)}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">Future value in {years} years</p>

      <dl className="mt-5 space-y-0 text-sm">
        <div className="flex items-baseline justify-between gap-3 border-b border-border/60 py-2.5">
          <dt className="text-muted-foreground">Invested</dt>
          <dd className="font-medium tabular-nums">{formatINR(invested)}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-3 py-1.5 pl-2 text-xs">
          <dt className="text-muted-foreground">Current portfolio</dt>
          <dd className="tabular-nums">{formatINR(projection.startingValue)}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-3 border-b border-border/60 py-1.5 pl-2 pb-2.5 text-xs">
          <dt className="text-muted-foreground">Future SIP ({years} yr)</dt>
          <dd className="tabular-nums">{formatINR(projection.newContributions)}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-3 py-2.5">
          <dt className="text-muted-foreground">Interest / gains</dt>
          <dd
            className={cn(
              "font-medium tabular-nums",
              projection.gain >= 0 ? "text-success" : "text-destructive"
            )}
          >
            {projection.gain >= 0 ? "+" : ""}
            {formatINR(projection.gain)}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-3 border-t border-border py-2.5 font-medium">
          <dt>Total</dt>
          <dd className="tabular-nums">{formatINR(projection.futureValue)}</dd>
        </div>
      </dl>

      <p className="mt-3 text-xs text-muted-foreground">
        Return on invested capital: {formatPercent(projection.absoluteReturnPct)}
      </p>
    </div>
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
        <span className="font-medium">{formatINR(futureValue)}</span>
        <span className="text-muted-foreground"> in {years} yr → </span>
        <span className="font-medium text-foreground">{formatINR(todayValue)} today</span>
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        ~{formatPercent(erosionPct)} less buying power than the headline number suggests
      </p>
    </div>
  );
}

export function FuturePredictionPanel({
  inputs,
}: {
  inputs: FuturePredictionInputs;
}) {
  const [years, setYears] = useState(10);

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

  const yearLabel = years === 1 ? "1 year" : `${years} years`;

  return (
    <Card className="overflow-hidden border-t-[3px] border-t-chart-5">
      <CardHeader>
        <CardTitle className="font-heading text-lg">Future value breakdown</CardTitle>
        <p className="text-sm text-muted-foreground">
          Exact invested capital vs interest at your chosen horizon. Assumes monthly SIP of{" "}
          <span className="font-medium tabular-nums text-foreground">
            {formatINR(inputs.monthlyInvestments)}
          </span>{" "}
          continues and current portfolio of{" "}
          <span className="font-medium tabular-nums text-foreground">
            {formatINR(inputs.currentPortfolioValue)}
          </span>
          .
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
          <ProjectionBreakdown
            title="Expected returns"
            subtitle={`${formatPercent(inputs.expectedReturnPct)} p.a. from your investment plan`}
            projection={expectedAtHorizon}
            years={years}
            accentClass="border-l-[3px] border-l-chart-1 bg-chart-1/5"
          />
          <ProjectionBreakdown
            title="Current returns"
            subtitle={`${formatPercent(inputs.currentReturnPct)} p.a. based on actual portfolio performance`}
            projection={currentAtHorizon}
            years={years}
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
      </CardContent>
    </Card>
  );
}
