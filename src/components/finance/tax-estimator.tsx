"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { plunkClass } from "@/components/ui/plunk";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MoneyInput } from "@/components/finance/money-input";
import { formatINR, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  breakdownSalaryPackage,
  compareTaxRegimes,
  type TaxRegime,
} from "@/lib/finance/tax";

interface TaxEstimatorProps {
  defaultMonthlySalary?: number;
  defaultBonus?: number;
  defaultRegime?: TaxRegime;
  bonusSpreadMonthly?: boolean;
}

export function TaxEstimator({
  defaultMonthlySalary = 0,
  defaultBonus = 0,
  defaultRegime = "new",
  bonusSpreadMonthly = false,
}: TaxEstimatorProps) {
  const [monthlySalary, setMonthlySalary] = useState(
    String(defaultMonthlySalary > 0 ? defaultMonthlySalary : 0)
  );
  const [annualBonus, setAnnualBonus] = useState(String(defaultBonus));
  const [regime, setRegime] = useState<TaxRegime>(defaultRegime);

  const salaryNum = Number(monthlySalary) || 0;
  const bonusNum = Number(annualBonus) || 0;
  const annualSalaryNum = salaryNum * 12;

  const breakdown = useMemo(() => {
    if (salaryNum === 0 && bonusNum === 0) return null;
    return breakdownSalaryPackage({
      annualInHandSalary: annualSalaryNum,
      annualInHandBonus: bonusNum,
      taxRegime: regime,
    });
  }, [salaryNum, bonusNum, annualSalaryNum, regime]);

  const regimeCompare = useMemo(() => {
    if (!breakdown) return null;
    return compareTaxRegimes(breakdown.estimatedTotalGross);
  }, [breakdown]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tax estimator (FY 2025-26)</CardTitle>
        <p className="text-sm text-muted-foreground">
          Enter in-hand amounts to see estimated gross and tax under Indian tax law
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Monthly in-hand salary (₹)</Label>
            <MoneyInput
              value={monthlySalary}
              onChange={(e) => setMonthlySalary(e.target.value)}
              placeholder="e.g. 141667"
            />
            {salaryNum > 0 ? (
              <p className="text-xs text-muted-foreground">
                ≈ {formatINR(annualSalaryNum, { compact: true })}/yr in-hand
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label>Annual bonus in-hand (₹, optional)</Label>
            <MoneyInput
              value={annualBonus}
              onChange={(e) => setAnnualBonus(e.target.value)}
              placeholder="e.g. 300000"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Tax regime</Label>
          <Tabs value={regime} onValueChange={(value) => value && setRegime(value as TaxRegime)}>
            <TabsList>
              <TabsTrigger value="new">New regime</TabsTrigger>
              <TabsTrigger value="old">Old regime</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {breakdown && (
          <div className="space-y-4">
            <div className={cn(plunkClass({ edge: "brand" }), "bg-brand p-6 text-brand-foreground")}>
              <p className="np-caps text-brand-foreground/70">Est. total tax</p>
              <p className="mt-1 text-3xl font-extrabold tracking-tight tabular-nums md:text-4xl">
                {formatINR(breakdown.estimatedTotalTax, { compact: true })}
              </p>
              <p className="mt-2 text-xs text-brand-foreground/70">
                Effective rate {formatPercent(breakdown.combinedTaxDetail.effectiveRate)}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="border border-border bg-card p-4">
                <p className="np-caps text-muted-foreground">Monthly salary in-hand</p>
                <p className="mt-1 text-sm font-bold tabular-nums">
                  {formatINR(breakdown.monthlyInHandSalary, { compact: true })}
                </p>
              </div>
              {bonusNum > 0 && (
                <div className="border border-border bg-card p-4">
                  <p className="np-caps text-muted-foreground">
                    Bonus {bonusSpreadMonthly ? "(spread monthly)" : "(lump-sum yearly)"}
                  </p>
                  <p className="mt-1 text-sm font-bold tabular-nums">
                    {bonusSpreadMonthly
                      ? formatINR(bonusNum / 12, { compact: true })
                      : formatINR(bonusNum, { compact: true })}
                  </p>
                </div>
              )}
              <div className="border border-border bg-card p-4">
                <p className="np-caps text-muted-foreground">Total monthly in-hand</p>
                <p className="mt-1 text-sm font-bold tabular-nums">
                  {formatINR(
                    breakdown.monthlyInHandSalary +
                      (bonusSpreadMonthly ? bonusNum / 12 : 0),
                    { compact: true }
                  )}
                </p>
              </div>
              <div className="border border-border bg-card p-4">
                <p className="np-caps text-muted-foreground">Est. gross package</p>
                <p className="mt-1 text-sm font-bold tabular-nums">
                  {formatINR(breakdown.estimatedTotalGross, { compact: true })}
                </p>
              </div>
            </div>

            {regimeCompare && (
              <p className="text-xs text-muted-foreground">
                Regime comparison on est. gross: New regime tax{" "}
                {formatINR(regimeCompare.newRegime.totalTax, { compact: true })} vs Old regime{" "}
                {formatINR(regimeCompare.oldRegime.totalTax, { compact: true })} (without
                deductions). Lower tax:{" "}
                <span className="font-bold capitalize">{regimeCompare.recommended} regime</span>.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
