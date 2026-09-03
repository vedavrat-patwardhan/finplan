"use client";

import { useActionState, useEffect, useMemo, useRef, useState, startTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  createInvestmentAction,
  updateInvestmentAction,
} from "@/actions/finance";
import { MoneyInput } from "@/components/finance/money-input";
import type { ActionResult } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LabeledSelect } from "@/components/ui/labeled-select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { FREQUENCIES, INVESTMENT_TYPES } from "@/lib/finance/constants";
import type { Frequency } from "@/lib/finance/constants";
import {
  absoluteReturnFromFundValue,
  calculateInvestmentMetrics,
  fundValueFromAbsoluteReturn,
  isLumpSumInvestment,
  resolveLumpSumMode,
  type LumpSumMode,
  type ReturnInputSource,
} from "@/lib/finance/investment-metrics";
import {
  formatDateInputValue,
  formatFrequency,
  formatINR,
  formatInvestmentType,
  parseDateInputValue,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import type { InvestmentListItem } from "@/components/finance/investment-card";

const FIELD_CLASS = "w-full";

type FormValues = {
  name: string;
  type: string;
  amount: string;
  frequency: Frequency;
  startDate: string;
  deductionDay: string;
  lastPaidDate: string;
  absoluteReturnPct: string;
  currentValue: string;
  monthlyWithdrawalPct: string;
  expectedReturnPct: string;
  notes: string;
};

function buildInitialValues(investment?: InvestmentListItem): FormValues {
  const fundValue = investment?.metrics.fundValue;

  return {
    name: investment?.name ?? "",
    type: investment?.type ?? "sip",
    amount: investment ? String(investment.amount) : "",
    frequency: investment?.frequency ?? "monthly",
    startDate: formatDateInputValue(investment?.startDate),
    deductionDay:
      investment?.deductionDay != null ? String(investment.deductionDay) : "",
    lastPaidDate: formatDateInputValue(investment?.lastPaidDate),
    absoluteReturnPct:
      investment?.absoluteReturnPct != null
        ? String(investment.absoluteReturnPct)
        : "",
    currentValue: fundValue != null ? String(Math.round(fundValue)) : "",
    monthlyWithdrawalPct:
      investment?.monthlyWithdrawalPct != null
        ? String(investment.monthlyWithdrawalPct)
        : "",
    expectedReturnPct: investment
      ? String(investment.expectedReturnPct)
      : "12",
    notes: investment?.notes ?? "",
  };
}

function formatNumber(value: number, digits = 2): string {
  const factor = 10 ** digits;
  return String(Math.round(value * factor) / factor);
}

function deriveLumpSumMode(investment?: InvestmentListItem): LumpSumMode {
  if (!investment) return "growth";
  return resolveLumpSumMode({
    monthlyWithdrawalPct: investment.monthlyWithdrawalPct,
    absoluteReturnPct: investment.absoluteReturnPct,
  });
}

export function InvestmentFormSheet({
  investment,
  triggerLabel,
}: {
  investment?: InvestmentListItem;
  triggerLabel?: string;
}) {
  const router = useRouter();
  const isEdit = Boolean(investment);
  const [open, setOpen] = useState(false);
  const [formValues, setFormValues] = useState<FormValues>(() =>
    buildInitialValues(investment)
  );
  const [returnSource, setReturnSource] = useState<ReturnInputSource | null>(
    investment?.absoluteReturnPct != null ? "absoluteReturnPct" : null
  );
  const [lumpSumMode, setLumpSumMode] = useState<LumpSumMode>(() =>
    deriveLumpSumMode(investment)
  );
  const wasPending = useRef(false);
  const action = isEdit ? updateInvestmentAction : createInvestmentAction;
  const [state, formAction, pending] = useActionState(action, {
    success: false,
  });

  const isLumpSum = isLumpSumInvestment(formValues.type);

  useEffect(() => {
    if (open) {
      setFormValues(buildInitialValues(investment));
      setReturnSource(
        investment?.absoluteReturnPct != null ? "absoluteReturnPct" : null
      );
      setLumpSumMode(deriveLumpSumMode(investment));
    }
  }, [open, investment]);

  useEffect(() => {
    if (wasPending.current && !pending) {
      if (state.success) {
        setOpen(false);
        router.refresh();
        toast.success(isEdit ? "Investment updated" : "Investment added");
      } else if (state.error) {
        toast.error(state.error);
      }
    }
    wasPending.current = pending;
  }, [pending, state.success, state.error, isEdit, router]);

  const metricsPreview = useMemo(() => {
    const amount = Number(formValues.amount);
    if (!amount || Number.isNaN(amount)) {
      return calculateInvestmentMetrics({
        amount: 0,
        frequency: "monthly",
        startDate: new Date(),
        investmentType: formValues.type,
      });
    }

    const startDate = parseDateInputValue(formValues.startDate) ?? new Date();
    const lastPaidDate = parseDateInputValue(formValues.lastPaidDate);
    const deductionDay = formValues.deductionDay
      ? Number(formValues.deductionDay)
      : undefined;

    return calculateInvestmentMetrics({
      amount,
      frequency: isLumpSum ? "one_time" : formValues.frequency,
      startDate,
      investmentType: formValues.type,
      deductionDay,
      lastPaidDate,
      absoluteReturnPct: formValues.absoluteReturnPct
        ? Number(formValues.absoluteReturnPct)
        : undefined,
      monthlyWithdrawalPct:
        isLumpSum && lumpSumMode === "withdrawal" && formValues.monthlyWithdrawalPct
          ? Number(formValues.monthlyWithdrawalPct)
          : undefined,
    });
  }, [formValues, isLumpSum, lumpSumMode]);

  const principal = Number(formValues.amount) || 0;
  const totalInvested =
    isLumpSum && lumpSumMode === "growth"
      ? metricsPreview.totalInvested || principal
      : metricsPreview.totalInvested;
  const monthlyPayout = metricsPreview.monthlyWithdrawalAmount;
  const showPerformanceFields =
    !isLumpSum || (isLumpSum && lumpSumMode === "growth");

  useEffect(() => {
    if (!showPerformanceFields || !returnSource || totalInvested <= 0) return;

    if (returnSource === "absoluteReturnPct" && formValues.absoluteReturnPct) {
      const pct = Number(formValues.absoluteReturnPct);
      if (!Number.isNaN(pct)) {
        const nextValue = formatNumber(
          fundValueFromAbsoluteReturn(totalInvested, pct),
          0
        );
        setFormValues((current) =>
          current.currentValue === nextValue
            ? current
            : { ...current, currentValue: nextValue }
        );
      }
      return;
    }

    if (returnSource === "currentValue" && formValues.currentValue) {
      const value = Number(formValues.currentValue);
      if (!Number.isNaN(value)) {
        const nextReturn = formatNumber(
          absoluteReturnFromFundValue(totalInvested, value)
        );
        setFormValues((current) =>
          current.absoluteReturnPct === nextReturn
            ? current
            : { ...current, absoluteReturnPct: nextReturn }
        );
      }
    }
  }, [
    showPerformanceFields,
    totalInvested,
    returnSource,
    formValues.absoluteReturnPct,
    formValues.currentValue,
  ]);

  function patchForm(patch: Partial<FormValues>) {
    setFormValues((current) => ({ ...current, ...patch }));
  }

  function handleTypeChange(type: string) {
    if (isLumpSumInvestment(type)) {
      patchForm({
        type,
        frequency: "one_time",
        deductionDay: "",
        lastPaidDate: "",
        absoluteReturnPct: "",
        currentValue: "",
        monthlyWithdrawalPct: "",
        expectedReturnPct: "12",
      });
      setLumpSumMode("growth");
      setReturnSource(null);
      return;
    }

    patchForm({
      type,
      monthlyWithdrawalPct: "",
      frequency: formValues.frequency === "one_time" ? "monthly" : formValues.frequency,
      expectedReturnPct:
        formValues.expectedReturnPct === "0" ? "12" : formValues.expectedReturnPct,
    });
    setLumpSumMode("growth");
  }

  function handleLumpSumModeChange(mode: LumpSumMode) {
    setLumpSumMode(mode);
    if (mode === "growth") {
      patchForm({ monthlyWithdrawalPct: "" });
      setReturnSource(null);
      return;
    }
    patchForm({
      absoluteReturnPct: "",
      currentValue: "",
      expectedReturnPct: "0",
    });
    setReturnSource(null);
  }

  function handleReturnChange(value: string) {
    setReturnSource("absoluteReturnPct");
    patchForm({ absoluteReturnPct: value });

    const pct = Number(value);
    if (!value) {
      patchForm({ currentValue: "" });
      setReturnSource(null);
      return;
    }

    if (!Number.isNaN(pct) && totalInvested > 0) {
      patchForm({
        currentValue: formatNumber(fundValueFromAbsoluteReturn(totalInvested, pct), 0),
      });
    }
  }

  function handleValueChange(value: string) {
    setReturnSource("currentValue");
    patchForm({ currentValue: value });

    const fundValue = Number(value);
    if (!value) {
      patchForm({ absoluteReturnPct: "" });
      setReturnSource(null);
      return;
    }

    if (!Number.isNaN(fundValue) && totalInvested > 0) {
      patchForm({
        absoluteReturnPct: formatNumber(
          absoluteReturnFromFundValue(totalInvested, fundValue)
        ),
      });
    }
  }

  function buildFormData(): FormData {
    const fd = new FormData();
    if (investment) fd.set("id", investment.id);

    fd.set("name", formValues.name);
    fd.set("type", formValues.type);
    fd.set("amount", formValues.amount);
    fd.set("frequency", isLumpSum ? "one_time" : formValues.frequency);
    fd.set("expectedReturnPct", formValues.expectedReturnPct);
    fd.set("notes", formValues.notes);

    if (formValues.startDate) fd.set("startDate", formValues.startDate);

    if (isLumpSum) {
      fd.set("lumpSumMode", lumpSumMode);
      if (lumpSumMode === "withdrawal") {
        if (formValues.monthlyWithdrawalPct) {
          fd.set("monthlyWithdrawalPct", formValues.monthlyWithdrawalPct);
        }
      } else {
        if (formValues.absoluteReturnPct) {
          fd.set("absoluteReturnPct", formValues.absoluteReturnPct);
        }
        if (formValues.currentValue) fd.set("currentValue", formValues.currentValue);
        if (returnSource) fd.set("returnSource", returnSource);
      }
    } else {
      if (formValues.deductionDay) fd.set("deductionDay", formValues.deductionDay);
      if (formValues.lastPaidDate) fd.set("lastPaidDate", formValues.lastPaidDate);
      if (formValues.absoluteReturnPct) {
        fd.set("absoluteReturnPct", formValues.absoluteReturnPct);
      }
      if (formValues.currentValue) fd.set("currentValue", formValues.currentValue);
      if (returnSource) fd.set("returnSource", returnSource);
    }

    return fd;
  }

  const resolvedTriggerLabel =
    triggerLabel ?? (isEdit ? "Edit" : "Add investment");

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            variant={isEdit ? "ghost" : "brand"}
            size={isEdit ? "icon-sm" : "default"}
            aria-label={isEdit ? resolvedTriggerLabel : undefined}
          />
        }
      >
        {isEdit ? <Pencil className="size-4 shrink-0" /> : <Plus className="size-4 shrink-0" />}
        {isEdit ? null : resolvedTriggerLabel}
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="flex h-[92dvh] max-h-[92dvh] flex-col gap-0 p-0 md:h-auto md:max-h-[88dvh]"
      >
        <div className="mx-auto mt-3 h-1 w-10 shrink-0 bg-border md:hidden" />
        <SheetHeader className="shrink-0 border-b border-border px-5 py-4 md:px-6 md:py-5">
          <SheetTitle>
            {isEdit ? "Edit investment" : "Add investment"}
          </SheetTitle>
          <SheetDescription className="leading-relaxed">
            {isLumpSum
              ? "One-time principal — track growing value or monthly withdrawals to your bank."
              : "Track start date, payment schedule, and performance using return % or current value."}
          </SheetDescription>
        </SheetHeader>

        {open ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              startTransition(() => {
                formAction(buildFormData());
              });
            }}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5 md:px-6 md:py-6">
              <div className="space-y-2">
                <Label htmlFor="investment-name">Name</Label>
                <Input
                  id="investment-name"
                  className={FIELD_CLASS}
                  value={formValues.name}
                  onChange={(e) => patchForm({ name: e.target.value })}
                  placeholder="e.g. Nifty 50 SIP, PPF"
                  required
                />
              </div>

              <div className={cn("grid gap-4", !isLumpSum && "sm:grid-cols-2")}>
                <div className="space-y-2">
                  <Label htmlFor="investment-type">Type</Label>
                  <LabeledSelect
                    id="investment-type"
                    className={FIELD_CLASS}
                    value={formValues.type}
                    onValueChange={handleTypeChange}
                    options={INVESTMENT_TYPES.map((type) => ({
                      value: type,
                      label: formatInvestmentType(type),
                    }))}
                    placeholder="Select type"
                  />
                </div>

                {!isLumpSum ? (
                  <div className="space-y-2">
                    <Label htmlFor="investment-frequency">Frequency</Label>
                    <LabeledSelect
                      id="investment-frequency"
                      className={FIELD_CLASS}
                      value={formValues.frequency}
                      onValueChange={(value) =>
                        patchForm({ frequency: value as Frequency })
                      }
                      options={FREQUENCIES.filter((f) => f !== "one_time").map(
                        (frequency) => ({
                          value: frequency,
                          label: formatFrequency(frequency),
                        })
                      )}
                      placeholder="Select frequency"
                    />
                  </div>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="investment-amount">
                  {isLumpSum ? "Principal (₹)" : "Amount (₹)"}
                </Label>
                <MoneyInput
                  id="investment-amount"
                  className={FIELD_CLASS}
                  value={formValues.amount}
                  onChange={(e) => patchForm({ amount: e.target.value })}
                  placeholder={isLumpSum ? "e.g. 200000" : "e.g. 15000"}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="investment-start-date">
                  Started on
                  <span className="ml-1.5 font-normal text-muted-foreground">
                    (optional)
                  </span>
                </Label>
                <DatePicker
                  id="investment-start-date"
                  className={FIELD_CLASS}
                  value={formValues.startDate}
                  onChange={(value) => patchForm({ startDate: value })}
                  placeholder="Select start date"
                />
              </div>

              {isLumpSum ? (
                <div className="space-y-3">
                  <Label>How does this lump sum work?</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {(
                      [
                        ["growth", "Growing value"],
                        ["withdrawal", "Monthly withdrawal"],
                      ] as const
                    ).map(([mode, tileLabel]) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => handleLumpSumModeChange(mode)}
                        className={cn(
                          "cursor-pointer border border-input bg-card px-4 py-3 text-left text-sm font-semibold transition-colors",
                          lumpSumMode === mode &&
                            "border-foreground border-l-[3px] border-l-brand bg-accent"
                        )}
                      >
                        {tileLabel}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {!isLumpSum ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="investment-deduction-day">
                      SIP deduction day
                      <span className="ml-1.5 font-normal text-muted-foreground">
                        (optional)
                      </span>
                    </Label>
                    <Input
                      id="investment-deduction-day"
                      className={FIELD_CLASS}
                      type="number"
                      min={1}
                      max={31}
                      value={formValues.deductionDay}
                      onChange={(e) => patchForm({ deductionDay: e.target.value })}
                      placeholder="e.g. 5"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="investment-last-paid">
                      Last paid on
                      <span className="ml-1.5 font-normal text-muted-foreground">
                        (optional)
                      </span>
                    </Label>
                    <DatePicker
                      id="investment-last-paid"
                      className={FIELD_CLASS}
                      value={formValues.lastPaidDate}
                      onChange={(value) => patchForm({ lastPaidDate: value })}
                      placeholder="Override last payment date"
                    />
                  </div>
                </>
              ) : null}

              {showPerformanceFields ? (
                <>
                  <div className="space-y-4 border border-border bg-card p-4">
                    <div className="space-y-1">
                      <p className="text-sm font-bold">Performance</p>
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        Enter absolute return or current fund value — the other field
                        updates automatically.
                      </p>
                    </div>

                    <div className="bg-muted px-4 py-3">
                      <p className="np-caps text-muted-foreground">
                        {isLumpSum ? "Principal" : "Total invested so far"}
                      </p>
                      <p className="mt-1 font-extrabold tabular-nums">
                        {formatINR(totalInvested)}
                      </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="investment-return">
                          Absolute return (%)
                          <span className="ml-1.5 font-normal text-muted-foreground">
                            (optional)
                          </span>
                        </Label>
                        <Input
                          id="investment-return"
                          className={FIELD_CLASS}
                          type="number"
                          step="0.01"
                          value={formValues.absoluteReturnPct}
                          onChange={(e) => handleReturnChange(e.target.value)}
                          placeholder="e.g. 18.5"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="investment-current-value">
                          Current value (₹)
                          <span className="ml-1.5 font-normal text-muted-foreground">
                            (optional)
                          </span>
                        </Label>
                        <MoneyInput
                          id="investment-current-value"
                          className={FIELD_CLASS}
                          value={formValues.currentValue}
                          onChange={(e) => handleValueChange(e.target.value)}
                          placeholder="e.g. 425000"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="investment-expected-return">
                      Expected return (% p.a.)
                    </Label>
                    <Input
                      id="investment-expected-return"
                      className={FIELD_CLASS}
                      type="number"
                      step="0.1"
                      min={0}
                      max={100}
                      value={formValues.expectedReturnPct}
                      onChange={(e) =>
                        patchForm({ expectedReturnPct: e.target.value })
                      }
                      placeholder="e.g. 12"
                      required
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-4 border border-border bg-card p-4">
                  <div className="space-y-1">
                    <p className="text-sm font-bold">Return withdrawal</p>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      Principal stays invested. Enter the monthly % you withdraw to
                      your bank account.
                    </p>
                  </div>

                  <div className="bg-muted px-4 py-3">
                    <p className="np-caps text-muted-foreground">Principal</p>
                    <p className="mt-1 font-extrabold tabular-nums">
                      {formatINR(principal)}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="investment-withdrawal-pct">
                      Monthly return withdrawal (%)
                      <span className="ml-1.5 font-normal text-muted-foreground">
                        (optional)
                      </span>
                    </Label>
                    <Input
                      id="investment-withdrawal-pct"
                      className={FIELD_CLASS}
                      type="number"
                      step="0.01"
                      min={0}
                      max={100}
                      value={formValues.monthlyWithdrawalPct}
                      onChange={(e) =>
                        patchForm({ monthlyWithdrawalPct: e.target.value })
                      }
                      placeholder="e.g. 2"
                    />
                    {monthlyPayout != null ? (
                      <p className="text-xs text-muted-foreground">
                        Monthly payout to bank:{" "}
                        <span className="font-medium text-foreground">
                          {formatINR(monthlyPayout)}
                        </span>
                      </p>
                    ) : null}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="investment-notes">
                  Notes
                  <span className="ml-1.5 font-normal text-muted-foreground">
                    (optional)
                  </span>
                </Label>
                <Input
                  id="investment-notes"
                  className={FIELD_CLASS}
                  value={formValues.notes}
                  onChange={(e) => patchForm({ notes: e.target.value })}
                  placeholder="Optional context"
                />
              </div>
            </div>

            <SheetFooter className="shrink-0 border-t border-border bg-muted px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] md:px-6">
              <Button type="submit" variant="default" size="lg" className="w-full" disabled={pending}>
                {pending ? "Saving..." : "Save changes"}
              </Button>
            </SheetFooter>
          </form>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
