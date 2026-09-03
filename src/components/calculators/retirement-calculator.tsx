"use client";

import { useMemo, useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
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
  calculateAffordableRetirementLifestyle,
  calculateInsuranceGap,
  calculateRetirementCorpus,
} from "@/lib/finance/engine";
import {
  ReverseBudgetOptions,
  type ReverseBudgetOption,
} from "@/components/calculators/reverse-budget-options";

interface RetirementCalculatorProps {
  defaults?: {
    monthlyExpenses?: number;
    monthlyIncome?: number;
    monthlySurplus?: number;
    totalCoverage?: number;
    retirementMultiplier?: number;
  };
}

export function RetirementCalculator({ defaults }: RetirementCalculatorProps) {
  const [monthlyExpenses, setMonthlyExpenses] = useState(
    defaults?.monthlyExpenses ?? 50000
  );
  const [multiplier, setMultiplier] = useState(
    defaults?.retirementMultiplier ?? 25
  );
  const [yearsToRetire, setYearsToRetire] = useState(25);
  const [expectedReturn, setExpectedReturn] = useState(10);
  const [, startTransition] = useTransition();

  const monthlySurplus = defaults?.monthlySurplus ?? 0;
  const annualExpenses = monthlyExpenses * 12;

  const corpus = useMemo(
    () => calculateRetirementCorpus(annualExpenses, multiplier),
    [annualExpenses, multiplier]
  );

  const insuranceGap = useMemo(
    () =>
      calculateInsuranceGap(
        (defaults?.monthlyIncome ?? monthlyExpenses * 1.5) * 12,
        defaults?.totalCoverage ?? 0
      ),
    [defaults?.monthlyIncome, defaults?.totalCoverage, monthlyExpenses]
  );

  const monthlySaveNeeded =
    yearsToRetire > 0 ? corpus / (yearsToRetire * 12) : corpus;

  const reverseOptions = useMemo((): ReverseBudgetOption[] => {
    if (monthlySurplus <= 0) return [];

    return buildSurplusBudgetTiers(
      monthlySurplus,
      SURPLUS_UTILIZATION_TIERS,
      (monthlyBudget) =>
        calculateAffordableRetirementLifestyle(
          monthlyBudget,
          yearsToRetire,
          multiplier,
          expectedReturn
        )
    ).map((tier) => ({
      id: tier.id,
      label: tier.label,
      description: tier.description,
      utilizationPct: tier.utilizationPct,
      monthlyBudget: tier.monthlyBudget,
      metrics: [
        {
          label: "Retirement corpus",
          value: tier.result.corpus,
          highlight: true,
          compact: true,
        },
        { label: "Monthly save", value: tier.monthlyBudget },
        {
          label: "Affordable monthly expenses",
          value: tier.result.monthlyExpenses,
        },
      ],
    }));
  }, [monthlySurplus, yearsToRetire, multiplier, expectedReturn]);

  const insuranceReverseOptions = useMemo((): ReverseBudgetOption[] => {
    if (monthlySurplus <= 0) return [];

    return buildSurplusBudgetTiers(
      monthlySurplus,
      SURPLUS_UTILIZATION_TIERS,
      (monthlyBudget) => {
        const annualPremiumBudget = monthlyBudget * 12;
        const existingCoverage = defaults?.totalCoverage ?? 0;
        const annualIncome = (defaults?.monthlyIncome ?? monthlyExpenses * 1.5) * 12;
        const recommendedCover = annualIncome * 12;
        const additionalCoverFromBudget = annualPremiumBudget * 100;
        return {
          additionalCover: additionalCoverFromBudget,
          totalCover: existingCoverage + additionalCoverFromBudget,
          gapRemaining: Math.max(
            0,
            recommendedCover - existingCoverage - additionalCoverFromBudget
          ),
        };
      }
    ).map((tier) => ({
      id: tier.id,
      label: tier.label,
      description: tier.description,
      utilizationPct: tier.utilizationPct,
      monthlyBudget: tier.monthlyBudget,
      metrics: [
        {
          label: "Additional cover (est.)",
          value: tier.result.additionalCover,
          highlight: true,
          compact: true,
        },
        { label: "Monthly premium budget", value: tier.monthlyBudget },
        {
          label: "Gap remaining",
          value: tier.result.gapRemaining,
          compact: true,
        },
      ],
    }));
  }, [monthlySurplus, defaults?.totalCoverage, defaults?.monthlyIncome, monthlyExpenses]);

  return (
    <Tabs defaultValue="forward" className="space-y-6">
      <TabsList>
        <TabsTrigger value="forward">Corpus needed</TabsTrigger>
        <TabsTrigger value="reverse">What lifestyle can I afford?</TabsTrigger>
      </TabsList>

      <TabsContent value="forward" className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
          <Card>
            <CardContent className="grid gap-4 pt-5 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Monthly expenses at retirement (₹)</Label>
                <MoneyInput
                  value={monthlyExpenses}
                  onChange={(e) =>
                    startTransition(() => setMonthlyExpenses(Number(e.target.value)))
                  }
                  placeholder="e.g. 50000"
                />
              </div>
              <div className="space-y-2">
                <Label>Corpus multiplier</Label>
                <Input
                  type="number"
                  value={multiplier}
                  onChange={(e) =>
                    startTransition(() => setMultiplier(Number(e.target.value)))
                  }
                  placeholder="e.g. 25"
                />
              </div>
              <div className="space-y-2">
                <Label>Years to retirement</Label>
                <Input
                  type="number"
                  value={yearsToRetire}
                  onChange={(e) =>
                    startTransition(() => setYearsToRetire(Number(e.target.value)))
                  }
                  placeholder="e.g. 25"
                />
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <div className={cn(plunkClass({ edge: "brand" }), "bg-brand p-6 text-brand-foreground")}>
              <p className="np-caps text-brand-foreground/70">Retirement corpus needed</p>
              <p className="mt-1 text-3xl font-extrabold tracking-tight tabular-nums md:text-4xl">
                {formatINR(corpus, { compact: true })}
              </p>
              <p className="mt-2 text-xs text-brand-foreground/70">
                {multiplier}× annual expenses rule · save{" "}
                {formatINR(monthlySaveNeeded, { compact: true })}/mo if starting now
              </p>
            </div>
            <div className="border border-border bg-card p-5">
              <p className="np-caps text-muted-foreground">Term insurance gap</p>
              <p className="mt-1 text-xl font-extrabold tabular-nums">
                {formatINR(insuranceGap, { compact: true })}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Recommended cover minus existing coverage (12× income heuristic)
              </p>
            </div>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="reverse" className="space-y-6">
        <Card>
          <CardContent className="grid gap-4 pt-5 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Years to retirement</Label>
              <Input
                type="number"
                value={yearsToRetire}
                onChange={(e) =>
                  startTransition(() => setYearsToRetire(Number(e.target.value)))
                }
                placeholder="e.g. 25"
              />
            </div>
            <div className="space-y-2">
              <Label>Corpus multiplier</Label>
              <Input
                type="number"
                value={multiplier}
                onChange={(e) =>
                  startTransition(() => setMultiplier(Number(e.target.value)))
                }
                placeholder="e.g. 25"
              />
            </div>
            <div className="space-y-2">
              <Label>Expected return while saving (% p.a.)</Label>
              <Input
                type="number"
                step="0.1"
                value={expectedReturn}
                onChange={(e) =>
                  startTransition(() => setExpectedReturn(Number(e.target.value)))
                }
                placeholder="e.g. 10"
              />
            </div>
          </CardContent>
        </Card>

        {monthlySurplus > 0 ? (
          <>
            <ReverseBudgetOptions
              monthlySurplus={monthlySurplus}
              options={reverseOptions}
            />
            <div className="space-y-3">
              <p className="text-sm font-bold">Term insurance premium budget</p>
              <p className="text-xs text-muted-foreground">
                Rough estimate: ₹100 of annual premium ≈ ₹1 lakh cover (varies by age and
                health).
              </p>
              <ReverseBudgetOptions
                monthlySurplus={monthlySurplus}
                options={insuranceReverseOptions}
              />
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Add income and expenses in your profile to see retirement lifestyle options.
          </p>
        )}
      </TabsContent>
    </Tabs>
  );
}
