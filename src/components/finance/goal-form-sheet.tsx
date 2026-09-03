"use client";

import { useActionState, useEffect, useMemo, useRef, useState, startTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { createGoalAction, updateGoalAction } from "@/actions/finance";
import { MoneyInput } from "@/components/finance/money-input";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SELECTABLE_GOAL_TYPES, type GoalType } from "@/lib/finance/constants";
import {
  calculateTargetFromDetails,
  getGoalTypeDefaults,
  PRIORITY_TIER_LABELS,
  type GoalDetails,
  type GoalTargetMode,
} from "@/lib/finance/goal-planning";
import {
  formatDateInputValue,
  formatEnumLabel,
  formatINR,
  parseDateInputValue,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import type { GoalFeasibility } from "@/lib/finance/engine";

const FIELD_CLASS = "h-8 w-full";

export type GoalListItem = {
  id: string;
  title: string;
  goalType: GoalType;
  status?: "active" | "completed";
  targetMode?: GoalTargetMode;
  targetAmount: number;
  targetDate?: Date | string | null;
  currentSaved: number;
  monthlyContribution: number;
  inflationRate?: number | null;
  expectedReturnPct?: number | null;
  stepUpPct?: number | null;
  priorityTier?: number | null;
  details?: GoalDetails | null;
  assumptions?: { notes?: string | null } | null;
  feasibility?: GoalFeasibility;
};

type FormValues = {
  title: string;
  goalType: GoalType;
  targetMode: GoalTargetMode;
  targetAmount: string;
  targetDate: string;
  currentSaved: string;
  monthlyContribution: string;
  inflationRate: string;
  expectedReturnPct: string;
  stepUpPct: string;
  priorityTier: string;
  notes: string;
  propertyValue: string;
  downPaymentPct: string;
  stampDutyPct: string;
  registrationPct: string;
  includeClosingCosts: boolean;
  monthlyExpenseAtRetirement: string;
  corpusMultiplier: string;
  retirementAge: string;
  currentAge: string;
  monthsOfExpenses: string;
  monthlyExpenseBasis: string;
  yearsUntilCourse: string;
  courseDurationYears: string;
  annualCostToday: string;
  educationInflationPct: string;
  onRoadPrice: string;
  carDownPaymentPct: string;
  exchangeValue: string;
  estimatedBudget: string;
  oneTimeSetupCost: string;
  firstYearMonthlyCost: string;
};

function buildInitialValues(
  goal?: GoalListItem,
  defaultMonthlyExpenses?: number
): FormValues {
  const defaults = getGoalTypeDefaults(goal?.goalType ?? "custom");
  const d = goal?.details ?? {};

  return {
    title: goal?.title ?? "",
    goalType: goal?.goalType ?? "house",
    targetMode: goal?.targetMode ?? "calculated",
    targetAmount: goal ? String(goal.targetAmount) : "",
    targetDate: formatDateInputValue(goal?.targetDate),
    currentSaved: goal ? String(goal.currentSaved) : "0",
    monthlyContribution: goal ? String(goal.monthlyContribution) : "0",
    inflationRate: String(goal?.inflationRate ?? defaults.inflationRate),
    expectedReturnPct: String(goal?.expectedReturnPct ?? defaults.expectedReturnPct),
    stepUpPct: String(goal?.stepUpPct ?? defaults.stepUpPct),
    priorityTier: String(goal?.priorityTier ?? defaults.priorityTier),
    notes: goal?.assumptions?.notes ?? "",
    propertyValue: d.propertyValue != null ? String(d.propertyValue) : "",
    downPaymentPct: String(d.downPaymentPct ?? defaults.details.downPaymentPct ?? 20),
    stampDutyPct: String(d.stampDutyPct ?? defaults.details.stampDutyPct ?? 6),
    registrationPct: String(d.registrationPct ?? defaults.details.registrationPct ?? 1),
    includeClosingCosts: d.includeClosingCosts ?? true,
    monthlyExpenseAtRetirement:
      d.monthlyExpenseAtRetirement != null
        ? String(d.monthlyExpenseAtRetirement)
        : "",
    corpusMultiplier: String(d.corpusMultiplier ?? defaults.details.corpusMultiplier ?? 25),
    retirementAge: d.retirementAge != null ? String(d.retirementAge) : "",
    currentAge: d.currentAge != null ? String(d.currentAge) : "",
    monthsOfExpenses: String(
      d.monthsOfExpenses ?? defaults.details.monthsOfExpenses ?? 6
    ),
    monthlyExpenseBasis:
      d.monthlyExpenseBasis != null
        ? String(d.monthlyExpenseBasis)
        : defaultMonthlyExpenses
          ? String(Math.round(defaultMonthlyExpenses))
          : "",
    yearsUntilCourse: String(d.yearsUntilCourse ?? defaults.details.yearsUntilCourse ?? 12),
    courseDurationYears: String(
      d.courseDurationYears ?? defaults.details.courseDurationYears ?? 4
    ),
    annualCostToday: d.annualCostToday != null ? String(d.annualCostToday) : "",
    educationInflationPct: String(
      d.educationInflationPct ?? defaults.details.educationInflationPct ?? 10
    ),
    onRoadPrice: d.onRoadPrice != null ? String(d.onRoadPrice) : "",
    carDownPaymentPct: String(
      d.carDownPaymentPct ?? defaults.details.carDownPaymentPct ?? 20
    ),
    exchangeValue: d.exchangeValue != null ? String(d.exchangeValue) : "0",
    estimatedBudget: d.estimatedBudget != null ? String(d.estimatedBudget) : "",
    oneTimeSetupCost: d.oneTimeSetupCost != null ? String(d.oneTimeSetupCost) : "",
    firstYearMonthlyCost:
      d.firstYearMonthlyCost != null ? String(d.firstYearMonthlyCost) : "",
  };
}

function formValuesToDetails(values: FormValues): GoalDetails {
  const num = (v: string) => (v ? Number(v) : undefined);
  return {
    propertyValue: num(values.propertyValue),
    downPaymentPct: num(values.downPaymentPct),
    stampDutyPct: num(values.stampDutyPct),
    registrationPct: num(values.registrationPct),
    includeClosingCosts: values.includeClosingCosts,
    monthlyExpenseAtRetirement: num(values.monthlyExpenseAtRetirement),
    corpusMultiplier: num(values.corpusMultiplier),
    retirementAge: num(values.retirementAge),
    currentAge: num(values.currentAge),
    monthsOfExpenses: num(values.monthsOfExpenses),
    monthlyExpenseBasis: num(values.monthlyExpenseBasis),
    yearsUntilCourse: num(values.yearsUntilCourse),
    courseDurationYears: num(values.courseDurationYears),
    annualCostToday: num(values.annualCostToday),
    educationInflationPct: num(values.educationInflationPct),
    onRoadPrice: num(values.onRoadPrice),
    carDownPaymentPct: num(values.carDownPaymentPct),
    exchangeValue: num(values.exchangeValue),
    estimatedBudget: num(values.estimatedBudget),
    oneTimeSetupCost: num(values.oneTimeSetupCost),
    firstYearMonthlyCost: num(values.firstYearMonthlyCost),
  };
}

/** Square NeoPop option tile grid — replaces native radios/selects for small closed choice sets. */
function OptionTiles({
  options,
  value,
  onChange,
  className,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-2", className)}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              "border border-input bg-card px-4 py-3 text-left text-sm font-semibold transition-colors",
              selected
                ? "border-foreground border-l-[3px] border-l-brand bg-accent"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function GoalFormSheet({
  goal,
  defaultMonthlyExpenses,
  triggerLabel,
}: {
  goal?: GoalListItem;
  defaultMonthlyExpenses?: number;
  triggerLabel?: string;
}) {
  const router = useRouter();
  const isEdit = Boolean(goal);
  const [open, setOpen] = useState(false);
  const [formValues, setFormValues] = useState<FormValues>(() =>
    buildInitialValues(goal, defaultMonthlyExpenses)
  );
  const wasPending = useRef(false);
  const action = isEdit ? updateGoalAction : createGoalAction;
  const [state, formAction, pending] = useActionState(action, { success: false });

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setFormValues(buildInitialValues(goal, defaultMonthlyExpenses));
    }
    setOpen(nextOpen);
  }

  useEffect(() => {
    if (wasPending.current && !pending) {
      if (state.success) {
        setOpen(false);
        router.refresh();
        toast.success(isEdit ? "Goal updated" : "Goal added");
      } else if (state.error) {
        toast.error(state.error);
      }
    }
    wasPending.current = pending;
  }, [pending, state.success, state.error, isEdit, router]);

  function patchForm(patch: Partial<FormValues>) {
    setFormValues((current) => ({ ...current, ...patch }));
  }

  function applyTypeDefaults(type: GoalType) {
    const defaults = getGoalTypeDefaults(type);
    patchForm({
      goalType: type,
      inflationRate: String(defaults.inflationRate),
      expectedReturnPct: String(defaults.expectedReturnPct),
      stepUpPct: String(defaults.stepUpPct),
      priorityTier: String(defaults.priorityTier),
      downPaymentPct: String(defaults.details.downPaymentPct ?? 20),
      stampDutyPct: String(defaults.details.stampDutyPct ?? 6),
      registrationPct: String(defaults.details.registrationPct ?? 1),
      corpusMultiplier: String(defaults.details.corpusMultiplier ?? 25),
      monthsOfExpenses: String(defaults.details.monthsOfExpenses ?? 6),
      yearsUntilCourse: String(defaults.details.yearsUntilCourse ?? 12),
      courseDurationYears: String(defaults.details.courseDurationYears ?? 4),
      educationInflationPct: String(defaults.details.educationInflationPct ?? 10),
      carDownPaymentPct: String(defaults.details.carDownPaymentPct ?? 20),
      targetMode: type === "custom" ? "manual" : "calculated",
    });
  }

  const calculatedTarget = useMemo(() => {
    const targetDate = parseDateInputValue(formValues.targetDate);
    if (!targetDate || formValues.targetMode !== "calculated") return null;
    const amount = calculateTargetFromDetails(
      formValues.goalType,
      formValuesToDetails(formValues),
      targetDate
    );
    return amount > 0 ? amount : null;
  }, [formValues]);

  const effectiveTarget =
    formValues.targetMode === "calculated" && calculatedTarget != null
      ? calculatedTarget
      : Number(formValues.targetAmount) || 0;

  function buildFormData(): FormData {
    const fd = new FormData();
    if (goal) fd.set("id", goal.id);

    const fields: (keyof FormValues)[] = [
      "title",
      "goalType",
      "targetMode",
      "targetAmount",
      "targetDate",
      "currentSaved",
      "monthlyContribution",
      "inflationRate",
      "expectedReturnPct",
      "stepUpPct",
      "priorityTier",
      "notes",
      "propertyValue",
      "downPaymentPct",
      "stampDutyPct",
      "registrationPct",
      "monthlyExpenseAtRetirement",
      "corpusMultiplier",
      "retirementAge",
      "currentAge",
      "monthsOfExpenses",
      "monthlyExpenseBasis",
      "yearsUntilCourse",
      "courseDurationYears",
      "annualCostToday",
      "educationInflationPct",
      "onRoadPrice",
      "carDownPaymentPct",
      "exchangeValue",
      "estimatedBudget",
      "oneTimeSetupCost",
      "firstYearMonthlyCost",
    ];

    for (const key of fields) {
      const value = formValues[key];
      if (typeof value === "string" && value !== "") {
        fd.set(key, value);
      }
    }

    if (formValues.targetMode === "calculated" && calculatedTarget != null) {
      fd.set("targetAmount", String(Math.round(calculatedTarget)));
    }

    if (formValues.includeClosingCosts) {
      fd.set("includeClosingCosts", "true");
    }

    return fd;
  }

  const resolvedTriggerLabel =
    triggerLabel ?? (isEdit ? "Edit" : "Add goal");

  const showCalculatedFields = formValues.targetMode === "calculated";

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger
        render={
          <Button
            variant={isEdit ? "outline" : "brand"}
            size={isEdit ? "sm" : "default"}
            aria-label={isEdit ? resolvedTriggerLabel : undefined}
          />
        }
      >
        {isEdit ? <Pencil className="size-4 shrink-0" /> : <Plus className="size-4 shrink-0" />}
        {isEdit ? (
          <span className="hidden md:inline">{resolvedTriggerLabel}</span>
        ) : (
          resolvedTriggerLabel
        )}
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="flex h-[92dvh] max-h-[92dvh] flex-col gap-0 p-0 md:h-auto md:max-h-[88dvh]"
      >
        <div className="mx-auto mt-3 h-1 w-10 shrink-0 bg-border md:hidden" />
        <SheetHeader className="shrink-0 border-b border-border px-5 py-4 md:px-6 md:py-5">
          <SheetTitle>{isEdit ? "Edit goal" : "Add life goal"}</SheetTitle>
          <SheetDescription className="leading-relaxed">
            Choose a goal type — each has its own inputs so FinPlan can calculate
            the right target and monthly saving needed.
          </SheetDescription>
        </SheetHeader>

        {open ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              startTransition(() => formAction(buildFormData()));
            }}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5 md:px-6 md:py-6">
              <div className="space-y-4">
                <p className="np-kicker np-caps text-xs text-subtle">Goal details</p>

                <div className="space-y-2">
                  <Label>Goal type</Label>
                  <OptionTiles
                    options={SELECTABLE_GOAL_TYPES.map((value) => ({
                      value,
                      label: formatEnumLabel(value),
                    }))}
                    value={formValues.goalType}
                    onChange={(value) => applyTypeDefaults(value as GoalType)}
                    className="grid-cols-2 sm:grid-cols-3"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Priority</Label>
                  <OptionTiles
                    options={([1, 2, 3] as const).map((tier) => ({
                      value: String(tier),
                      label: PRIORITY_TIER_LABELS[tier],
                    }))}
                    value={formValues.priorityTier}
                    onChange={(value) => patchForm({ priorityTier: value })}
                    className="grid-cols-3"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="goal-title">Goal title</Label>
                  <Input
                    id="goal-title"
                    className={FIELD_CLASS}
                    value={formValues.title}
                    onChange={(e) => patchForm({ title: e.target.value })}
                    placeholder="e.g. Mumbai flat down payment"
                    required
                  />
                </div>
              </div>

              <div className="space-y-4 border-t border-border pt-5">
                <p className="np-kicker np-caps text-xs text-subtle">Target</p>

                <div className="space-y-2">
                  <Label>How to set the target</Label>
                  <OptionTiles
                    options={[
                      { value: "calculated", label: "Calculate from inputs" },
                      { value: "manual", label: "Enter amount manually" },
                    ]}
                    value={formValues.targetMode}
                    onChange={(value) =>
                      patchForm({ targetMode: value as GoalTargetMode })
                    }
                    className="grid-cols-1 sm:grid-cols-2"
                  />
                </div>

                {showCalculatedFields ? (
                  <TypeSpecificFields
                    goalType={formValues.goalType}
                    formValues={formValues}
                    patchForm={patchForm}
                  />
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="goal-target-amount">Target amount (₹)</Label>
                    <MoneyInput
                      id="goal-target-amount"
                      className={FIELD_CLASS}
                      value={formValues.targetAmount}
                      onChange={(e) => patchForm({ targetAmount: e.target.value })}
                      placeholder="e.g. 3000000"
                      required
                    />
                  </div>
                )}

                {calculatedTarget != null && showCalculatedFields ? (
                  <div className="bg-muted px-4 py-3">
                    <p className="np-caps text-muted-foreground">Calculated target</p>
                    <p className="mt-1 font-extrabold tabular-nums">
                      {formatINR(calculatedTarget, { compact: true })}
                    </p>
                  </div>
                ) : null}
              </div>

              <div className="grid gap-4 border-t border-border pt-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="goal-target-date">Target date</Label>
                  <DatePicker
                    id="goal-target-date"
                    value={formValues.targetDate}
                    onChange={(value) => patchForm({ targetDate: value })}
                    className={FIELD_CLASS}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="goal-current-saved">Already saved (₹)</Label>
                  <MoneyInput
                    id="goal-current-saved"
                    className={FIELD_CLASS}
                    value={formValues.currentSaved}
                    onChange={(e) => patchForm({ currentSaved: e.target.value })}
                    placeholder="e.g. 200000"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="goal-monthly-contribution">
                  Planned monthly contribution (₹)
                </Label>
                <MoneyInput
                  id="goal-monthly-contribution"
                  className={FIELD_CLASS}
                  value={formValues.monthlyContribution}
                  onChange={(e) =>
                    patchForm({ monthlyContribution: e.target.value })
                  }
                  placeholder="e.g. 25000"
                />
              </div>

              <div className="space-y-4 border-t border-border pt-5">
                <p className="np-kicker np-caps text-xs text-subtle">
                  Planning assumptions
                </p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Inflation, expected investment return, and annual SIP step-up
                  vary by goal type — defaults are pre-filled from Indian planning
                  norms.
                </p>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="goal-inflation">Inflation (% p.a.)</Label>
                    <Input
                      id="goal-inflation"
                      className={FIELD_CLASS}
                      type="number"
                      step="0.1"
                      value={formValues.inflationRate}
                      onChange={(e) =>
                        patchForm({ inflationRate: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="goal-return">Expected return (% p.a.)</Label>
                    <Input
                      id="goal-return"
                      className={FIELD_CLASS}
                      type="number"
                      step="0.1"
                      value={formValues.expectedReturnPct}
                      onChange={(e) =>
                        patchForm({ expectedReturnPct: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="goal-step-up">SIP step-up (% p.a.)</Label>
                    <Input
                      id="goal-step-up"
                      className={FIELD_CLASS}
                      type="number"
                      step="0.1"
                      value={formValues.stepUpPct}
                      onChange={(e) => patchForm({ stepUpPct: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4 border-t border-border pt-5">
                <p className="np-kicker np-caps text-xs text-subtle">Notes</p>

                <div className="space-y-2">
                  <Label htmlFor="goal-notes">
                    Notes
                    <span className="ml-1.5 font-normal text-muted-foreground">
                      (optional)
                    </span>
                  </Label>
                  <Input
                    id="goal-notes"
                    className={FIELD_CLASS}
                    value={formValues.notes}
                    onChange={(e) => patchForm({ notes: e.target.value })}
                    placeholder="e.g. 2BHK in Pune, Tier-2 city"
                  />
                </div>

                {effectiveTarget > 0 ? (
                  <div className="bg-muted px-4 py-3">
                    <p className="np-caps text-muted-foreground">Feasibility target</p>
                    <p className="mt-1 font-extrabold tabular-nums">
                      {formatINR(effectiveTarget, { compact: true })}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Checked against this amount on save.
                    </p>
                  </div>
                ) : null}
              </div>
            </div>

            <SheetFooter className="shrink-0 border-t border-border bg-muted px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] md:px-6">
              <Button type="submit" variant="default" size="lg" className="w-full" disabled={pending}>
                {pending ? "Saving..." : "Save goal"}
              </Button>
            </SheetFooter>
          </form>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function TypeSpecificFields({
  goalType,
  formValues,
  patchForm,
}: {
  goalType: GoalType;
  formValues: FormValues;
  patchForm: (patch: Partial<FormValues>) => void;
}) {
  switch (goalType) {
    case "house":
      return (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Property value (₹)" id="property-value">
            <MoneyInput
              id="property-value"
              className={FIELD_CLASS}
              value={formValues.propertyValue}
              onChange={(e) => patchForm({ propertyValue: e.target.value })}
              placeholder="e.g. 12500000"
            />
          </Field>
          <Field label="Down payment (%)" id="down-pct">
            <Input
              id="down-pct"
              className={FIELD_CLASS}
              type="number"
              value={formValues.downPaymentPct}
              onChange={(e) => patchForm({ downPaymentPct: e.target.value })}
            />
          </Field>
          <label className="flex items-center gap-3 text-sm font-semibold sm:col-span-2">
            <Switch
              checked={formValues.includeClosingCosts}
              onCheckedChange={(checked) =>
                patchForm({ includeClosingCosts: checked })
              }
            />
            Include stamp duty & registration
          </label>
          {formValues.includeClosingCosts ? (
            <>
              <Field label="Stamp duty (%)" id="stamp-pct">
                <Input
                  id="stamp-pct"
                  className={FIELD_CLASS}
                  type="number"
                  step="0.1"
                  value={formValues.stampDutyPct}
                  onChange={(e) => patchForm({ stampDutyPct: e.target.value })}
                />
              </Field>
              <Field label="Registration (%)" id="reg-pct">
                <Input
                  id="reg-pct"
                  className={FIELD_CLASS}
                  type="number"
                  step="0.1"
                  value={formValues.registrationPct}
                  onChange={(e) =>
                    patchForm({ registrationPct: e.target.value })
                  }
                />
              </Field>
            </>
          ) : null}
        </div>
      );

    case "retirement":
      return (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Monthly expenses at retirement (₹, today)" id="ret-expense">
            <MoneyInput
              id="ret-expense"
              className={FIELD_CLASS}
              value={formValues.monthlyExpenseAtRetirement}
              onChange={(e) =>
                patchForm({ monthlyExpenseAtRetirement: e.target.value })
              }
              placeholder="e.g. 80000"
            />
          </Field>
          <Field label="Corpus multiplier" id="ret-mult">
            <Input
              id="ret-mult"
              className={FIELD_CLASS}
              type="number"
              value={formValues.corpusMultiplier}
              onChange={(e) => patchForm({ corpusMultiplier: e.target.value })}
              placeholder="e.g. 25"
            />
          </Field>
          <Field label="Your current age" id="current-age">
            <Input
              id="current-age"
              className={FIELD_CLASS}
              type="number"
              value={formValues.currentAge}
              onChange={(e) => patchForm({ currentAge: e.target.value })}
            />
          </Field>
          <Field label="Retirement age" id="ret-age">
            <Input
              id="ret-age"
              className={FIELD_CLASS}
              type="number"
              value={formValues.retirementAge}
              onChange={(e) => patchForm({ retirementAge: e.target.value })}
            />
          </Field>
        </div>
      );

    case "emergency_fund":
      return (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Months of expenses to cover" id="ef-months">
            <Input
              id="ef-months"
              className={FIELD_CLASS}
              type="number"
              min={1}
              max={24}
              value={formValues.monthsOfExpenses}
              onChange={(e) => patchForm({ monthsOfExpenses: e.target.value })}
            />
          </Field>
          <Field label="Monthly expense basis (₹)" id="ef-basis">
            <MoneyInput
              id="ef-basis"
              className={FIELD_CLASS}
              value={formValues.monthlyExpenseBasis}
              onChange={(e) =>
                patchForm({ monthlyExpenseBasis: e.target.value })
              }
              placeholder="From your expense budgets"
            />
          </Field>
        </div>
      );

    case "education":
      return (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Annual fee today (₹)" id="edu-fee">
            <MoneyInput
              id="edu-fee"
              className={FIELD_CLASS}
              value={formValues.annualCostToday}
              onChange={(e) => patchForm({ annualCostToday: e.target.value })}
            />
          </Field>
          <Field label="Course duration (years)" id="edu-duration">
            <Input
              id="edu-duration"
              className={FIELD_CLASS}
              type="number"
              value={formValues.courseDurationYears}
              onChange={(e) =>
                patchForm({ courseDurationYears: e.target.value })
              }
            />
          </Field>
          <Field label="Years until course starts" id="edu-years">
            <Input
              id="edu-years"
              className={FIELD_CLASS}
              type="number"
              value={formValues.yearsUntilCourse}
              onChange={(e) => patchForm({ yearsUntilCourse: e.target.value })}
            />
          </Field>
          <Field label="Education inflation (% p.a.)" id="edu-inflation">
            <Input
              id="edu-inflation"
              className={FIELD_CLASS}
              type="number"
              step="0.1"
              value={formValues.educationInflationPct}
              onChange={(e) =>
                patchForm({ educationInflationPct: e.target.value })
              }
            />
          </Field>
        </div>
      );

    case "car":
      return (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="On-road price (₹)" id="car-price">
            <MoneyInput
              id="car-price"
              className={FIELD_CLASS}
              value={formValues.onRoadPrice}
              onChange={(e) => patchForm({ onRoadPrice: e.target.value })}
            />
          </Field>
          <Field label="Down payment (%)" id="car-down">
            <Input
              id="car-down"
              className={FIELD_CLASS}
              type="number"
              value={formValues.carDownPaymentPct}
              onChange={(e) =>
                patchForm({ carDownPaymentPct: e.target.value })
              }
            />
          </Field>
          <Field label="Exchange / trade-in value (₹)" id="car-exchange">
            <MoneyInput
              id="car-exchange"
              className={FIELD_CLASS}
              value={formValues.exchangeValue}
              onChange={(e) => patchForm({ exchangeValue: e.target.value })}
            />
          </Field>
        </div>
      );

    case "marriage":
      return (
        <Field label="Estimated budget today (₹)" id="wed-budget">
          <MoneyInput
            id="wed-budget"
            className={FIELD_CLASS}
            value={formValues.estimatedBudget}
            onChange={(e) => patchForm({ estimatedBudget: e.target.value })}
            placeholder="e.g. 1500000"
          />
        </Field>
      );

    case "baby":
      return (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="One-time setup costs (₹)" id="baby-setup">
            <MoneyInput
              id="baby-setup"
              className={FIELD_CLASS}
              value={formValues.oneTimeSetupCost}
              onChange={(e) => patchForm({ oneTimeSetupCost: e.target.value })}
              placeholder="Hospital, gear, etc."
            />
          </Field>
          <Field label="First-year monthly costs (₹)" id="baby-monthly">
            <MoneyInput
              id="baby-monthly"
              className={FIELD_CLASS}
              value={formValues.firstYearMonthlyCost}
              onChange={(e) =>
                patchForm({ firstYearMonthlyCost: e.target.value })
              }
              placeholder="Childcare, diapers, etc."
            />
          </Field>
        </div>
      );

    default:
      return (
        <div className="space-y-2">
          <Label htmlFor="custom-target">Target amount (₹)</Label>
          <MoneyInput
            id="custom-target"
            className={FIELD_CLASS}
            value={formValues.targetAmount}
            onChange={(e) => patchForm({ targetAmount: e.target.value })}
          />
        </div>
      );
  }
}

function Field({
  label,
  id,
  children,
}: {
  label: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}
