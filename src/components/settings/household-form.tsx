"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
  startTransition,
} from "react";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/finance/money-input";
import { updateHouseholdAction } from "@/actions/finance";
import type { ActionResult } from "@/actions/auth";
import { breakdownSalaryPackage } from "@/lib/finance/tax";
import { formatINR, formatPercent } from "@/lib/format";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const initialState: ActionResult = { success: false };

interface HouseholdFormProps {
  household: {
    householdEnabled: boolean;
    spouseName: string;
    spouseAnnualInHandSalary: number;
    spouseAnnualInHandBonus: number;
    spouseTaxRegime: "new" | "old";
  };
}

export function HouseholdForm({ household }: HouseholdFormProps) {
  const [state, formAction, pending] = useActionState(updateHouseholdAction, initialState);
  const wasPending = useRef(false);

  const [enabled, setEnabled] = useState(household.householdEnabled);
  const [spouseName, setSpouseName] = useState(household.spouseName);
  const defaultMonthlySalary =
    household.spouseAnnualInHandSalary > 0 ? household.spouseAnnualInHandSalary / 12 : 0;
  const [monthlySalary, setMonthlySalary] = useState(
    defaultMonthlySalary > 0 ? String(defaultMonthlySalary) : ""
  );
  const [annualBonus, setAnnualBonus] = useState(
    household.spouseAnnualInHandBonus > 0 ? String(household.spouseAnnualInHandBonus) : ""
  );
  const [taxRegime, setTaxRegime] = useState<"new" | "old">(household.spouseTaxRegime);

  const monthlySalaryNum = Number(monthlySalary) || 0;
  const annualSalaryNum = monthlySalaryNum * 12;
  const annualBonusNum = Number(annualBonus) || 0;

  const taxPreview = useMemo(() => {
    if (!enabled || (monthlySalaryNum === 0 && annualBonusNum === 0)) return null;
    return breakdownSalaryPackage({
      annualInHandSalary: annualSalaryNum,
      annualInHandBonus: annualBonusNum,
      taxRegime,
    });
  }, [annualBonusNum, annualSalaryNum, enabled, monthlySalaryNum, taxRegime]);

  useEffect(() => {
    if (wasPending.current && !pending) {
      if (state.success) toast.success("Household settings updated");
      else if (state.error) toast.error(state.error);
    }
    wasPending.current = pending;
  }, [pending, state.success, state.error]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        fd.set("householdEnabled", enabled ? "true" : "false");
        fd.set("spouseName", spouseName.trim());
        fd.set("spouseMonthlyInHandSalary", enabled ? monthlySalary || "0" : "0");
        fd.set("spouseAnnualInHandBonus", enabled ? annualBonus || "0" : "0");
        fd.set("spouseTaxRegime", taxRegime);
        startTransition(() => formAction(fd));
      }}
      className="space-y-5"
    >
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border px-4 py-4 transition-colors hover:bg-muted/30">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => setEnabled(event.target.checked)}
          className="mt-0.5 size-4"
        />
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Users className="size-4 text-chart-1" />
            Plan together as a household
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Combine your income and expenses in one plan. Tag items as yours, your
            partner&apos;s, or shared — no second account needed.
          </p>
        </div>
      </label>

      {enabled ? (
        <>
          <div className="space-y-2">
            <Label htmlFor="spouse-name">Partner&apos;s name</Label>
            <Input
              id="spouse-name"
              name="spouseName"
              value={spouseName}
              onChange={(event) => setSpouseName(event.target.value)}
              placeholder="e.g. Priya"
              required
            />
            {state.fieldErrors?.spouseName ? (
              <p className="text-xs text-destructive">{state.fieldErrors.spouseName}</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Used on income and expense labels throughout the app.
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="spouse-monthly-salary">
                Partner&apos;s monthly in-hand salary (₹)
              </Label>
              <MoneyInput
                id="spouse-monthly-salary"
                name="spouseMonthlyInHandSalary"
                value={monthlySalary}
                onChange={(event) => setMonthlySalary(event.target.value)}
                placeholder="e.g. 120000"
              />
              {monthlySalaryNum > 0 ? (
                <p className="text-xs text-muted-foreground">
                  ≈ {formatINR(annualSalaryNum, { compact: true })}/yr in-hand
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Leave blank if you add partner income separately
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="spouse-annual-bonus">
                Partner&apos;s annual bonus in-hand (₹, optional)
              </Label>
              <MoneyInput
                id="spouse-annual-bonus"
                name="spouseAnnualInHandBonus"
                value={annualBonus}
                onChange={(event) => setAnnualBonus(event.target.value)}
                placeholder="e.g. 200000"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Partner tax regime (FY 2025-26)</Label>
            <div className="flex flex-wrap gap-2">
              {(["new", "old"] as const).map((regime) => (
                <button
                  key={regime}
                  type="button"
                  onClick={() => setTaxRegime(regime)}
                  className={cn(
                    "min-h-11 rounded-full px-4 py-2 text-sm capitalize transition-colors",
                    taxRegime === regime
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  {regime} regime
                </button>
              ))}
            </div>
            <input type="hidden" name="spouseTaxRegime" value={taxRegime} />
          </div>

          {taxPreview ? (
            <div className="space-y-3 rounded-xl bg-muted/40 p-4">
              <p className="text-sm font-medium">Partner estimated tax breakdown</p>
              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-muted-foreground">Total in-hand</p>
                  <p className="font-medium tabular-nums">
                    {formatINR(taxPreview.totalInHandAnnual, { compact: true })}/yr
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Effective tax rate</p>
                  <p className="font-medium tabular-nums">
                    {formatPercent(taxPreview.combinedTaxDetail.effectiveRate)}
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </>
      ) : null}

      <Button
        type="submit"
        className="min-h-11"
        disabled={pending || (enabled && !spouseName.trim())}
      >
        {pending ? "Saving..." : "Save household settings"}
      </Button>
    </form>
  );
}
