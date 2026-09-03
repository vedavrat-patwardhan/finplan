"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { DatePickerField } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { plunkClass } from "@/components/ui/plunk";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MoneyInput } from "@/components/finance/money-input";
import { formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";
import { SURPLUS_UTILIZATION_TIERS } from "@/lib/finance/constants";
import {
  buildSurplusBudgetTiers,
  calculateAchievableGoalTarget,
  inflationAdjust,
  monthsUntil,
} from "@/lib/finance/engine";
import {
  ReverseBudgetOptions,
  type ReverseBudgetOption,
} from "@/components/calculators/reverse-budget-options";

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

  const monthlySurplus = defaults?.monthlySurplus ?? 0;

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
      onTrack: monthlySurplus > 0 ? requiredMonthly <= monthlySurplus : null,
    };
  }, [target, saved, targetDate, inflation, monthlySurplus]);

  const reverseOptions = useMemo((): ReverseBudgetOption[] => {
    if (!targetDate || monthlySurplus <= 0) return [];

    const months = monthsUntil(new Date(targetDate));

    return buildSurplusBudgetTiers(
      monthlySurplus,
      SURPLUS_UTILIZATION_TIERS,
      (monthlyBudget) =>
        calculateAchievableGoalTarget(monthlyBudget, months, inflation, saved)
    ).map((tier) => ({
      id: tier.id,
      label: tier.label,
      description: tier.description,
      utilizationPct: tier.utilizationPct,
      monthlyBudget: tier.monthlyBudget,
      metrics: [
        {
          label: "Achievable target (today's ₹)",
          value: tier.result.todayTarget,
          highlight: true,
          compact: true,
        },
        { label: "Monthly save", value: tier.monthlyBudget },
        {
          label: "At goal date (inflated)",
          value: tier.result.inflatedTarget,
          compact: true,
        },
      ],
    }));
  }, [targetDate, monthlySurplus, inflation, saved]);

  return (
    <Tabs defaultValue="forward" className="space-y-6">
      <TabsList>
        <TabsTrigger value="forward">Plan a goal</TabsTrigger>
        <TabsTrigger value="reverse">What goal can I reach?</TabsTrigger>
      </TabsList>

      <TabsContent value="forward" className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
          <Card>
            <CardContent className="grid gap-4 pt-5 sm:grid-cols-2">
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
            </CardContent>
          </Card>

          {result ? (
            <div className="space-y-4">
              <div className={cn(plunkClass({ edge: "brand" }), "bg-brand p-6 text-brand-foreground")}>
                <p className="np-caps text-brand-foreground/70">Required monthly save</p>
                <p className="mt-1 text-3xl font-extrabold tracking-tight tabular-nums md:text-4xl">
                  {formatINR(result.requiredMonthly)}
                </p>
              </div>
              {result.onTrack !== null ? (
                <p
                  className={cn(
                    "text-xs font-semibold",
                    result.onTrack ? "text-success-text" : "text-destructive"
                  )}
                >
                  {result.onTrack
                    ? "Fits within your current monthly surplus"
                    : "Exceeds your current surplus — adjust timeline or target"}
                </p>
              ) : null}
              <div className="border border-border bg-card p-5">
                <p className="np-caps text-muted-foreground">Inflation-adjusted target</p>
                <p className="mt-1 text-xl font-extrabold tabular-nums">
                  {formatINR(result.inflatedTarget, { compact: true })}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  In {result.months} months · today&apos;s equivalent{" "}
                  {formatINR(result.todayValue, { compact: true })}
                </p>
              </div>
              <div className="border border-border bg-card p-5">
                <p className="np-caps text-muted-foreground">Gap remaining</p>
                <p className="mt-1 text-xl font-extrabold tabular-nums">
                  {formatINR(result.gap, { compact: true })}
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </TabsContent>

      <TabsContent value="reverse" className="space-y-6">
        <Card>
          <CardContent className="grid gap-4 pt-5 sm:grid-cols-2 lg:grid-cols-3">
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
              id="goal-reverse-target-date"
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
          </CardContent>
        </Card>

        {monthlySurplus > 0 && targetDate ? (
          <ReverseBudgetOptions
            monthlySurplus={monthlySurplus}
            options={reverseOptions}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            {monthlySurplus <= 0
              ? "Add income and expenses in your profile to see achievable goal targets."
              : "Select a target date to calculate achievable goals."}
          </p>
        )}
      </TabsContent>
    </Tabs>
  );
}
