"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/finance/money-input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { completeOnboardingAction } from "@/actions/finance";
import {
  DEFAULT_EXPENSE_TEMPLATES,
  DEFAULT_INVESTMENT_TEMPLATES,
  ONBOARDING_GOAL_OPTIONS,
} from "@/lib/finance/constants";
import { breakdownSalaryPackage } from "@/lib/finance/tax";
import { formatINR, formatPercent } from "@/lib/format";
import { toast } from "sonner";
import { formatExpenseClassLabel } from "@/lib/finance/expense-classes";
import { Target } from "lucide-react";

const STEPS = ["Welcome", "Income", "Expenses", "Investments", "Goals"] as const;

interface OnboardingWizardProps {
  initialName: string;
  revisit?: boolean;
}

export function OnboardingWizard({ initialName, revisit = false }: OnboardingWizardProps) {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const [income, setIncome] = useState({
    skipIncome: false,
    monthlyInHandSalary: "",
    annualInHandBonus: "",
    taxRegime: "new" as "new" | "old",
  });
  const [selectedExpenses, setSelectedExpenses] = useState<Set<number>>(new Set());
  const [selectedInvestments, setSelectedInvestments] = useState<Set<number>>(new Set());
  const [selectedGoals, setSelectedGoals] = useState<Set<string>>(new Set());

  const monthlySalary = Number(income.monthlyInHandSalary) || 0;
  const annualSalary = monthlySalary * 12;
  const annualBonus = Number(income.annualInHandBonus) || 0;

  const taxPreview = useMemo(() => {
    if (income.skipIncome || (monthlySalary === 0 && annualBonus === 0)) return null;
    return breakdownSalaryPackage({
      annualInHandSalary: annualSalary,
      annualInHandBonus: annualBonus,
      taxRegime: income.taxRegime,
    });
  }, [annualSalary, annualBonus, income.taxRegime, income.skipIncome, monthlySalary]);

  function canContinue() {
    if (step === 0) return initialName.trim().length > 0;
    if (step === 1 && !income.skipIncome && !revisit) {
      return monthlySalary > 0 || annualBonus > 0;
    }
    return true;
  }

  async function handleFinish() {
    setSubmitting(true);
    const formData = new FormData();
    formData.set("name", initialName.trim());
    formData.set("revisit", revisit ? "true" : "false");
    formData.set("skipIncome", income.skipIncome ? "true" : "false");
    formData.set("annualInHandSalary", String(annualSalary));
    formData.set("annualInHandBonus", String(annualBonus));
    formData.set("taxRegime", income.taxRegime);

    selectedExpenses.forEach((i) => formData.append("expenseTemplates", String(i)));
    selectedInvestments.forEach((i) => formData.append("investmentTemplates", String(i)));
    selectedGoals.forEach((id) => formData.append("goalOptions", id));

    const result = await completeOnboardingAction({ success: false }, formData);
    if (result.success) {
      toast.success(revisit ? "Selections added!" : "Setup complete!");
      router.push("/dashboard");
    } else if (result.error) {
      toast.error(result.error);
    }
    setSubmitting(false);
  }

  function handleFormKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && step < STEPS.length - 1) {
      e.preventDefault();
    }
  }

  return (
    <div className="page-container max-w-2xl py-10">
      <div className="mb-2 flex justify-between text-xs text-muted-foreground">
        {STEPS.map((label, i) => (
          <span key={label} className={i === step ? "font-medium text-primary" : ""}>
            {label}
          </span>
        ))}
      </div>
      <div className="mb-8 flex gap-2">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-muted"}`}
          />
        ))}
      </div>

      <div onKeyDown={handleFormKeyDown}>
        {step === 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="font-heading">
                {revisit
                  ? "Welcome back"
                  : initialName
                    ? `Welcome, ${initialName.split(" ")[0]}`
                    : "Welcome"}
              </CardTitle>
              <CardDescription>
                {revisit
                  ? "Pick expense budgets, investments, and goals to add to your plan."
                  : "Your name from account creation is already saved. You can change it anytime in Settings."}
              </CardDescription>
            </CardHeader>
            {initialName ? (
              <CardContent>
                <p className="rounded-lg bg-muted/40 px-4 py-3 text-sm">
                  Signed in as <span className="font-medium text-foreground">{initialName}</span>
                </p>
              </CardContent>
            ) : null}
          </Card>
        )}

        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="font-heading">Monthly income</CardTitle>
              <CardDescription>
                {revisit
                  ? "Your income is already set up. Skip this step or update it anytime from the Income page."
                  : "Enter in-hand amounts after TDS. Start with your monthly salary — annual figures are calculated automatically."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border px-4 py-3">
                <input
                  type="checkbox"
                  checked={income.skipIncome}
                  onChange={(e) => setIncome((p) => ({ ...p, skipIncome: e.target.checked }))}
                  className="size-4"
                />
                <span className="text-sm">Skip for now — I&apos;ll add income later</span>
              </label>

              {!income.skipIncome && (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="monthlySalary">Monthly in-hand salary (₹)</Label>
                      <MoneyInput
                        id="monthlySalary"
                        value={income.monthlyInHandSalary}
                        onChange={(e) =>
                          setIncome((p) => ({ ...p, monthlyInHandSalary: e.target.value }))
                        }
                        placeholder="141667"
                      />
                      {monthlySalary > 0 && (
                        <p className="text-xs text-muted-foreground">
                          ≈ {formatINR(annualSalary, { compact: true })}/yr in-hand
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="annualBonus">Annual bonus in-hand (₹, optional)</Label>
                      <MoneyInput
                        id="annualBonus"
                        value={income.annualInHandBonus}
                        onChange={(e) =>
                          setIncome((p) => ({ ...p, annualInHandBonus: e.target.value }))
                        }
                        placeholder="300000"
                      />
                      <p className="text-xs text-muted-foreground">
                        Paid separately once a year, after TDS
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Tax regime (FY 2025-26)</Label>
                    <div className="flex gap-2">
                      {(["new", "old"] as const).map((regime) => (
                        <button
                          key={regime}
                          type="button"
                          onClick={() => setIncome((p) => ({ ...p, taxRegime: regime }))}
                          className={`rounded-full px-4 py-1.5 text-sm capitalize transition-colors ${
                            income.taxRegime === regime
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground hover:bg-muted/80"
                          }`}
                        >
                          {regime} regime
                        </button>
                      ))}
                    </div>
                  </div>

                  {taxPreview && (
                    <div className="rounded-xl bg-muted/40 p-4 space-y-3">
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
                          <p className="font-medium">
                            {formatPercent(taxPreview.combinedTaxDetail.effectiveRate)}
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Based on FY 2025-26 {income.taxRegime} regime slabs, standard deduction, and
                        u/s 87A rebate. Actual TDS may vary by employer deductions.
                      </p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="font-heading">Common expenses</CardTitle>
              <CardDescription>Optional — select any that apply, edit amounts later</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {DEFAULT_EXPENSE_TEMPLATES.map((template, i) => (
                <label
                  key={template.name}
                  className="flex cursor-pointer items-center justify-between rounded-lg border border-border px-4 py-3 hover:bg-muted/40"
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedExpenses.has(i)}
                      onChange={() =>
                        setSelectedExpenses((prev) => {
                          const next = new Set(prev);
                          if (next.has(i)) next.delete(i);
                          else next.add(i);
                          return next;
                        })
                      }
                      className="size-4"
                    />
                    <div>
                      <p className="text-sm font-medium">{template.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {template.category} · {formatExpenseClassLabel(template.expenseClass)}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm tabular-nums">
                    {formatINR(template.amount, { compact: true })}/mo
                  </span>
                </label>
              ))}
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="font-heading">Investments</CardTitle>
              <CardDescription>Optional — SIPs and recurring plans</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {DEFAULT_INVESTMENT_TEMPLATES.map((template, i) => (
                <label
                  key={template.name}
                  className="flex cursor-pointer items-center justify-between rounded-lg border border-border px-4 py-3 hover:bg-muted/40"
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedInvestments.has(i)}
                      onChange={() =>
                        setSelectedInvestments((prev) => {
                          const next = new Set(prev);
                          if (next.has(i)) next.delete(i);
                          else next.add(i);
                          return next;
                        })
                      }
                      className="size-4"
                    />
                    <div>
                      <p className="text-sm font-medium">{template.name}</p>
                      <p className="text-xs text-muted-foreground">{template.type}</p>
                    </div>
                  </div>
                  <span className="text-sm tabular-nums">
                    {formatINR(template.amount, { compact: true })}/mo
                  </span>
                </label>
              ))}
            </CardContent>
          </Card>
        )}

        {step === 4 && (
          <Card className="mb-24">
            <CardHeader>
              <CardTitle className="font-heading">Your goals</CardTitle>
              <CardDescription>
                Choose milestones you&apos;re working toward. Nothing is selected by default.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {ONBOARDING_GOAL_OPTIONS.map((option) => {
                const selected = selectedGoals.has(option.id);
                return (
                  <label
                    key={option.id}
                    className={`flex cursor-pointer items-center justify-between rounded-lg border px-4 py-3 transition-colors ${
                      selected
                        ? "border-primary/40 bg-primary/5"
                        : "border-border hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() =>
                          setSelectedGoals((prev) => {
                            const next = new Set(prev);
                            if (next.has(option.id)) next.delete(option.id);
                            else next.add(option.id);
                            return next;
                          })
                        }
                        className="size-4"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <Target className="size-4 text-primary" />
                          <p className="text-sm font-medium">{option.title}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">{option.description}</p>
                      </div>
                    </div>
                    {option.targetAmount > 0 && (
                      <span className="text-sm tabular-nums text-muted-foreground">
                        {formatINR(option.targetAmount, { compact: true })}
                      </span>
                    )}
                  </label>
                );
              })}
              {selectedGoals.size === 0 && (
                <p className="rounded-lg bg-muted/30 px-4 py-3 text-center text-sm text-muted-foreground">
                  No goals selected — you can add them anytime from the Goals page.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        <div className="sticky bottom-0 mt-6 flex justify-between border-t border-border bg-background/95 px-1 py-4 backdrop-blur">
          <Button
            type="button"
            variant="outline"
            disabled={step === 0 || submitting}
            onClick={() => setStep((s) => s - 1)}
          >
            Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button
              type="button"
              disabled={!canContinue() || submitting}
              onClick={() => setStep((s) => s + 1)}
            >
              Continue
            </Button>
          ) : (
            <Button type="button" disabled={submitting} onClick={handleFinish}>
              {submitting
                ? revisit
                  ? "Saving..."
                  : "Setting up..."
                : revisit
                  ? "Add selections"
                  : "Finish setup"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
