"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/finance/money-input";
import { formatINR, formatPercent } from "@/lib/format";
import {
  breakdownSalaryPackage,
  compareTaxRegimes,
  type TaxRegime,
} from "@/lib/finance/tax";

interface TaxEstimatorProps {
  defaultSalary?: number;
  defaultBonus?: number;
  defaultRegime?: TaxRegime;
  bonusSpreadMonthly?: boolean;
}

export function TaxEstimator({
  defaultSalary = 1_700_000,
  defaultBonus = 300_000,
  defaultRegime = "new",
  bonusSpreadMonthly = false,
}: TaxEstimatorProps) {
  const [annualSalary, setAnnualSalary] = useState(String(defaultSalary));
  const [annualBonus, setAnnualBonus] = useState(String(defaultBonus));
  const [regime, setRegime] = useState<TaxRegime>(defaultRegime);

  const salaryNum = Number(annualSalary) || 0;
  const bonusNum = Number(annualBonus) || 0;

  const breakdown = useMemo(() => {
    if (salaryNum === 0 && bonusNum === 0) return null;
    return breakdownSalaryPackage({
      annualInHandSalary: salaryNum,
      annualInHandBonus: bonusNum,
      taxRegime: regime,
    });
  }, [salaryNum, bonusNum, regime]);

  const regimeCompare = useMemo(() => {
    if (!breakdown) return null;
    return compareTaxRegimes(breakdown.estimatedTotalGross);
  }, [breakdown]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-lg">Tax estimator (FY 2025-26)</CardTitle>
        <p className="text-sm text-muted-foreground">
          Enter in-hand amounts to see estimated gross and tax under Indian tax law
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Annual in-hand salary (₹)</Label>
            <MoneyInput value={annualSalary} onChange={(e) => setAnnualSalary(e.target.value)} placeholder="e.g. 1700000" />
          </div>
          <div className="space-y-2">
            <Label>Annual bonus in-hand (₹)</Label>
            <MoneyInput value={annualBonus} onChange={(e) => setAnnualBonus(e.target.value)} placeholder="e.g. 300000" />
          </div>
        </div>

        <div className="flex gap-2">
          {(["new", "old"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRegime(r)}
              className={`rounded-full px-4 py-1.5 text-sm capitalize ${
                regime === r
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {r} regime
            </button>
          ))}
        </div>

        {breakdown && (
          <div className="rounded-xl bg-muted/40 p-4 space-y-3 text-sm">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-muted-foreground">Monthly salary in-hand</p>
                <p className="font-medium tabular-nums">
                  {formatINR(breakdown.monthlyInHandSalary, { compact: true })}
                </p>
              </div>
              {bonusNum > 0 && (
                <div>
                  <p className="text-muted-foreground">
                    Bonus {bonusSpreadMonthly ? "(spread monthly)" : "(lump-sum yearly)"}
                  </p>
                  <p className="font-medium tabular-nums">
                    {bonusSpreadMonthly
                      ? formatINR(bonusNum / 12, { compact: true })
                      : formatINR(bonusNum, { compact: true })}
                  </p>
                </div>
              )}
              <div>
                <p className="text-muted-foreground">Total monthly in-hand</p>
                <p className="font-medium tabular-nums">
                  {formatINR(
                    breakdown.monthlyInHandSalary +
                      (bonusSpreadMonthly ? bonusNum / 12 : 0),
                    { compact: true }
                  )}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Est. gross package</p>
                <p className="font-medium tabular-nums">
                  {formatINR(breakdown.estimatedTotalGross, { compact: true })}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Est. total tax</p>
                <p className="font-medium tabular-nums text-destructive">
                  {formatINR(breakdown.estimatedTotalTax, { compact: true })}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Effective rate</p>
                <p className="font-medium">
                  {formatPercent(breakdown.combinedTaxDetail.effectiveRate)}
                </p>
              </div>
            </div>

            {regimeCompare && (
              <p className="text-xs text-muted-foreground">
                Regime comparison on est. gross: New regime tax{" "}
                {formatINR(regimeCompare.newRegime.totalTax, { compact: true })} vs Old regime{" "}
                {formatINR(regimeCompare.oldRegime.totalTax, { compact: true })} (without
                deductions). Lower tax:{" "}
                <span className="font-medium capitalize">{regimeCompare.recommended} regime</span>.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
