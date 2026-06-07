"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePickerField } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/finance/money-input";
import { formatINR } from "@/lib/format";
import { inflationAdjust, monthsUntil } from "@/lib/finance/engine";

function defaultTargetDate(): string {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 2);
  return date.toISOString().split("T")[0];
}

interface GoalPlannerCalculatorProps {
  defaults?: {
    inflationRate?: number;
    monthlySurplus?: number;
  };
}

export function GoalPlannerCalculator({ defaults }: GoalPlannerCalculatorProps) {
  const [target, setTarget] = useState(1500000);
  const [saved, setSaved] = useState(200000);
  const [targetDate, setTargetDate] = useState("");
  const [inflation, setInflation] = useState(defaults?.inflationRate ?? 6);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setTargetDate(defaultTargetDate());
  }, []);

  const result = useMemo(() => {
    if (!targetDate) return null;
    const date = new Date(targetDate);
    const months = monthsUntil(date);
    const years = months / 12;
    const inflatedTarget = target * Math.pow(1 + inflation / 100, years);
    const gap = Math.max(0, inflatedTarget - saved);
    const requiredMonthly = months > 0 ? gap / months : gap;
    const todayValue = inflationAdjust(inflatedTarget, years, inflation);

    return {
      months,
      inflatedTarget,
      gap,
      requiredMonthly,
      todayValue,
      onTrack: defaults?.monthlySurplus
        ? requiredMonthly <= defaults.monthlySurplus
        : null,
    };
  }, [target, saved, targetDate, inflation, defaults?.monthlySurplus]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2">
          <Label>Target amount today (₹)</Label>
          <MoneyInput
            value={target}
            onChange={(e) =>
              startTransition(() => setTarget(Number(e.target.value)))
            }
            placeholder="e.g. 1500000"
          />
        </div>
        <div className="space-y-2">
          <Label>Already saved (₹)</Label>
          <MoneyInput
            value={saved}
            onChange={(e) =>
              startTransition(() => setSaved(Number(e.target.value)))
            }
            placeholder="e.g. 200000"
          />
        </div>
        <DatePickerField
          id="goal-target-date"
          label="Target date"
          value={targetDate}
          onChange={(value) => startTransition(() => setTargetDate(value))}
          placeholder="Select target date"
          required
          fromYear={new Date().getFullYear()}
        />
        <div className="space-y-2">
          <Label>Inflation (% p.a.)</Label>
          <Input
            type="number"
            step="0.1"
            value={inflation}
            onChange={(e) =>
              startTransition(() => setInflation(Number(e.target.value)))
            }
            placeholder="e.g. 6"
          />
        </div>
      </div>

      {result ? (
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-base">Inflation-adjusted target</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-heading text-3xl font-semibold tabular-nums">
              {formatINR(result.inflatedTarget, { compact: true })}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              In {result.months} months · today&apos;s equivalent{" "}
              {formatINR(result.todayValue, { compact: true })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-base">Required monthly save</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-heading text-3xl font-semibold tabular-nums">
              {formatINR(result.requiredMonthly)}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Gap: {formatINR(result.gap, { compact: true })}
            </p>
            {result.onTrack !== null ? (
              <p className={`mt-2 text-sm ${result.onTrack ? "text-success" : "text-destructive"}`}>
                {result.onTrack
                  ? "Fits within your current monthly surplus"
                  : "Exceeds your current surplus — adjust timeline or target"}
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>
      ) : null}
    </div>
  );
}
