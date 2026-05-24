"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/finance/money-input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { completeOnboardingAction } from "@/actions/finance";
import type { ActionResult } from "@/actions/auth";
import {
  DEFAULT_EXPENSE_TEMPLATES,
  DEFAULT_INVESTMENT_TEMPLATES,
  DEFAULT_GOAL_TEMPLATES,
} from "@/lib/finance/constants";
import { formatINR } from "@/lib/format";
import { toast } from "sonner";

const initialState: ActionResult = { success: false };

export function OnboardingWizard() {
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState({
    name: "",
    monthlyTakeHome: "",
    salaryAmount: "",
  });
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    async (prev: ActionResult, formData: FormData) => {
      formData.set("name", profile.name);
      formData.set("monthlyTakeHome", profile.monthlyTakeHome);
      formData.set("salaryAmount", profile.salaryAmount);

      const result = await completeOnboardingAction(prev, formData);
      if (result.success) {
        toast.success("Setup complete!");
        router.push("/dashboard");
      }
      return result;
    },
    initialState
  );

  const steps = ["Profile", "Expenses", "Investments", "Goals"];

  function canContinue() {
    if (step === 0) {
      return profile.name && profile.monthlyTakeHome && profile.salaryAmount;
    }
    return true;
  }

  return (
    <div className="page-container max-w-2xl py-10">
      <div className="mb-8 flex gap-2">
        {steps.map((label, i) => (
          <div
            key={label}
            className={`h-1 flex-1 rounded-full ${
              i <= step ? "bg-primary" : "bg-muted"
            }`}
          />
        ))}
      </div>

      <form action={formAction}>
        <input type="hidden" name="name" value={profile.name} />
        <input type="hidden" name="monthlyTakeHome" value={profile.monthlyTakeHome} />
        <input type="hidden" name="salaryAmount" value={profile.salaryAmount} />

        {step === 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="font-heading">About you</CardTitle>
              <CardDescription>Basic profile and salary information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full name</Label>
                <Input
                  id="name"
                  value={profile.name}
                  onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="monthlyTakeHome">Monthly take-home (₹)</Label>
                <MoneyInput
                  id="monthlyTakeHome"
                  value={profile.monthlyTakeHome}
                  onChange={(e) =>
                    setProfile((p) => ({ ...p, monthlyTakeHome: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="salaryAmount">Primary salary (₹/month)</Label>
                <MoneyInput
                  id="salaryAmount"
                  value={profile.salaryAmount}
                  onChange={(e) =>
                    setProfile((p) => ({ ...p, salaryAmount: e.target.value }))
                  }
                  required
                />
              </div>
            </CardContent>
          </Card>
        )}

        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="font-heading">Common expenses</CardTitle>
              <CardDescription>Select defaults to start with — edit later</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {DEFAULT_EXPENSE_TEMPLATES.map((template, i) => (
                <label
                  key={template.name}
                  className="flex cursor-pointer items-center justify-between rounded-lg border border-border px-4 py-3 hover:bg-muted/40"
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      name="expenseTemplates"
                      value={String(i)}
                      defaultChecked
                      className="size-4"
                    />
                    <div>
                      <p className="text-sm font-medium">{template.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {template.category} · {template.expenseClass}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm tabular-nums">
                    {formatINR(template.amount, { compact: true })}
                  </span>
                </label>
              ))}
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="font-heading">Investments</CardTitle>
              <CardDescription>SIPs and recurring investment plans</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {DEFAULT_INVESTMENT_TEMPLATES.map((template, i) => (
                <label
                  key={template.name}
                  className="flex cursor-pointer items-center justify-between rounded-lg border border-border px-4 py-3 hover:bg-muted/40"
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      name="investmentTemplates"
                      value={String(i)}
                      defaultChecked={i === 0}
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

        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="font-heading">Life goals</CardTitle>
              <CardDescription>Pick milestones to track from day one</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {DEFAULT_GOAL_TEMPLATES.map((template, i) => (
                <label
                  key={template.title}
                  className="flex cursor-pointer items-center justify-between rounded-lg border border-border px-4 py-3 hover:bg-muted/40"
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      name="goalTemplates"
                      value={String(i)}
                      defaultChecked
                      className="size-4"
                    />
                    <div>
                      <p className="text-sm font-medium">{template.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Target in {template.monthsFromNow} months
                      </p>
                    </div>
                  </div>
                  <span className="text-sm tabular-nums">
                    {formatINR(template.targetAmount, { compact: true })}
                  </span>
                </label>
              ))}
            </CardContent>
          </Card>
        )}

        {state.error ? (
          <p className="mt-4 text-sm text-destructive">{state.error}</p>
        ) : null}

        <div className="mt-6 flex justify-between">
          <Button
            type="button"
            variant="outline"
            disabled={step === 0}
            onClick={() => setStep((s) => s - 1)}
          >
            Back
          </Button>
          {step < steps.length - 1 ? (
            <Button
              type="button"
              disabled={!canContinue()}
              onClick={() => setStep((s) => s + 1)}
            >
              Continue
            </Button>
          ) : (
            <Button type="submit" disabled={pending || !canContinue()}>
              {pending ? "Setting up..." : "Finish setup"}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
