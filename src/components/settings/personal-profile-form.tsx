"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
  startTransition,
} from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/finance/money-input";
import { updatePersonalProfileAction } from "@/actions/finance";
import type { ActionResult } from "@/actions/auth";
import { breakdownSalaryPackage } from "@/lib/finance/tax";
import { formatINR, formatPercent } from "@/lib/format";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const initialState: ActionResult = { success: false };

interface PersonalProfileFormProps {
  profile: {
    name: string;
    username: string;
    annualInHandSalary: number;
    annualInHandBonus: number;
    taxRegime: "new" | "old";
  };
}

export function PersonalProfileForm({ profile }: PersonalProfileFormProps) {
  const [state, formAction, pending] = useActionState(updatePersonalProfileAction, initialState);
  const wasPending = useRef(false);

  const defaultMonthlySalary =
    profile.annualInHandSalary > 0
      ? profile.annualInHandSalary / 12
      : 0;

  const [name, setName] = useState(profile.name);
  const [username, setUsername] = useState(profile.username);
  const [monthlySalary, setMonthlySalary] = useState(
    defaultMonthlySalary > 0 ? String(defaultMonthlySalary) : ""
  );
  const [annualBonus, setAnnualBonus] = useState(
    profile.annualInHandBonus > 0 ? String(profile.annualInHandBonus) : ""
  );
  const [taxRegime, setTaxRegime] = useState<"new" | "old">(profile.taxRegime);

  const monthlySalaryNum = Number(monthlySalary) || 0;
  const annualSalaryNum = monthlySalaryNum * 12;
  const annualBonusNum = Number(annualBonus) || 0;

  const taxPreview = useMemo(() => {
    if (monthlySalaryNum === 0 && annualBonusNum === 0) return null;
    return breakdownSalaryPackage({
      annualInHandSalary: annualSalaryNum,
      annualInHandBonus: annualBonusNum,
      taxRegime,
    });
  }, [annualSalaryNum, annualBonusNum, taxRegime, monthlySalaryNum]);

  useEffect(() => {
    if (wasPending.current && !pending) {
      if (state.success) toast.success("Profile updated");
      else if (state.error) toast.error(state.error);
    }
    wasPending.current = pending;
  }, [pending, state.success, state.error]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        fd.set("name", name.trim());
        fd.set("username", username.trim());
        fd.set("monthlyInHandSalary", monthlySalary || "0");
        fd.set("annualInHandBonus", annualBonus || "0");
        fd.set("taxRegime", taxRegime);
        startTransition(() => formAction(fd));
      }}
      className="space-y-5"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="profile-name">Full name</Label>
          <Input
            id="profile-name"
            name="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Your name"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="profile-username">Username</Label>
          <Input
            id="profile-username"
            name="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="Your username"
            autoComplete="username"
            required
            maxLength={30}
          />
          {state.fieldErrors?.username ? (
            <p className="text-xs text-destructive">{state.fieldErrors.username}</p>
          ) : (
            <p className="text-xs text-muted-foreground">Used to sign in. Letters, numbers, underscores.</p>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="profile-monthly-salary">Monthly in-hand salary (₹)</Label>
          <MoneyInput
            id="profile-monthly-salary"
            name="monthlyInHandSalary"
            value={monthlySalary}
            onChange={(event) => setMonthlySalary(event.target.value)}
            placeholder="e.g. 141667"
          />
          {monthlySalaryNum > 0 ? (
            <p className="text-xs text-muted-foreground">
              ≈ {formatINR(annualSalaryNum, { compact: true })}/yr in-hand
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Leave blank if you add income sources separately
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="profile-annual-bonus">Annual bonus in-hand (₹, optional)</Label>
          <MoneyInput
            id="profile-annual-bonus"
            name="annualInHandBonus"
            value={annualBonus}
            onChange={(event) => setAnnualBonus(event.target.value)}
            placeholder="e.g. 300000"
          />
          <p className="text-xs text-muted-foreground">
            Paid separately once a year, after TDS
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Tax regime (FY 2025-26)</Label>
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
        <input type="hidden" name="taxRegime" value={taxRegime} />
      </div>

      {taxPreview ? (
        <div className="space-y-3 rounded-xl bg-muted/40 p-4">
          <p className="text-sm font-medium">Estimated tax breakdown</p>
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <p className="text-muted-foreground">Total in-hand</p>
              <p className="font-medium tabular-nums">
                {formatINR(taxPreview.totalInHandAnnual, { compact: true })}/yr
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Est. gross package</p>
              <p className="font-medium tabular-nums">
                {formatINR(taxPreview.estimatedTotalGross, { compact: true })}/yr
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Est. total tax + cess</p>
              <p className="font-medium tabular-nums text-destructive">
                {formatINR(taxPreview.estimatedTotalTax, { compact: true })}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Effective tax rate</p>
              <p className="font-medium tabular-nums">
                {formatPercent(taxPreview.combinedTaxDetail.effectiveRate)}
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Based on FY 2025-26 {taxRegime} regime slabs, standard deduction, and u/s 87A rebate.
          </p>
        </div>
      ) : null}

      <Button type="submit" className="min-h-11" disabled={pending || !name.trim()}>
        {pending ? "Saving..." : "Save profile"}
      </Button>
    </form>
  );
}
