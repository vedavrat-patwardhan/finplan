"use client";

import { useActionState, useEffect, useRef, useState, startTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  createInsuranceAction,
  updateInsuranceAction,
} from "@/actions/finance";
import { MoneyInput } from "@/components/finance/money-input";
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
import {
  FREQUENCIES,
  INSURANCE_TYPES,
  isLifeInsuranceType,
} from "@/lib/finance/constants";
import type { Frequency, InsuranceType } from "@/lib/finance/constants";
import { addYears } from "date-fns";
import {
  formatDate,
  formatDateInputValue,
  formatFrequency,
  formatInsuranceType,
  parseDateInputValue,
} from "@/lib/format";

const FIELD_CLASS = "h-8 w-full";

export type InsuranceListItem = {
  id: string;
  name: string;
  provider?: string;
  type: InsuranceType;
  premium: number;
  frequency: Frequency;
  coverage: number;
  renewalDate?: Date | string;
  premiumStartDate?: Date | string;
  premiumEndDate?: Date | string;
  validTill?: Date | string;
  notes?: string;
};

type FormValues = {
  name: string;
  provider: string;
  type: InsuranceType;
  premium: string;
  frequency: Frequency;
  coverage: string;
  renewalDate: string;
  premiumStartDate: string;
  premiumEndDate: string;
  premiumEndMode: "date" | "tenure";
  premiumTenureYears: string;
  validTill: string;
};

function buildInitialValues(policy?: InsuranceListItem): FormValues {
  return {
    name: policy?.name ?? "",
    provider: policy?.provider ?? "",
    type: policy?.type ?? "term_life",
    premium: policy ? String(policy.premium) : "",
    frequency: policy?.frequency ?? "yearly",
    coverage: policy ? String(policy.coverage) : "",
    renewalDate: formatDateInputValue(policy?.renewalDate),
    premiumStartDate: formatDateInputValue(policy?.premiumStartDate),
    premiumEndDate: formatDateInputValue(policy?.premiumEndDate),
    premiumEndMode: "date",
    premiumTenureYears: "",
    validTill: formatDateInputValue(policy?.validTill),
  };
}

/**
 * Resolve the "paying premiums until" date the user intends to save. In tenure
 * mode it's derived from the start date (or today, if blank) plus the number of
 * years entered; in date mode it's the date picked directly.
 */
function resolvePremiumEndDate(values: FormValues): string {
  if (values.premiumEndMode === "tenure") {
    const years = Number(values.premiumTenureYears);
    if (!Number.isFinite(years) || years <= 0) return "";
    const anchor = parseDateInputValue(values.premiumStartDate) ?? new Date();
    return formatDateInputValue(addYears(anchor, years));
  }
  return values.premiumEndDate;
}

export function InsuranceFormSheet({
  policy,
  triggerLabel,
}: {
  policy?: InsuranceListItem;
  triggerLabel?: string;
}) {
  const router = useRouter();
  const isEdit = Boolean(policy);
  const [open, setOpen] = useState(false);
  const [formValues, setFormValues] = useState<FormValues>(() =>
    buildInitialValues(policy)
  );
  const wasPending = useRef(false);
  const action = isEdit ? updateInsuranceAction : createInsuranceAction;
  const [state, formAction, pending] = useActionState(action, {
    success: false,
  });

  const isLifePolicy = isLifeInsuranceType(formValues.type);

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setFormValues(buildInitialValues(policy));
    }
    setOpen(nextOpen);
  }

  useEffect(() => {
    if (wasPending.current && !pending) {
      if (state.success) {
        setOpen(false);
        router.refresh();
        toast.success(isEdit ? "Policy updated" : "Policy added");
      } else if (state.error) {
        toast.error(state.error);
      }
    }
    wasPending.current = pending;
  }, [pending, state.success, state.error, isEdit, router]);

  function patchForm(patch: Partial<FormValues>) {
    setFormValues((current) => ({ ...current, ...patch }));
  }

  function buildFormData(): FormData {
    const fd = new FormData();
    if (policy) fd.set("id", policy.id);

    fd.set("name", formValues.name);
    fd.set("provider", formValues.provider);
    fd.set("type", formValues.type);
    fd.set("premium", formValues.premium);
    fd.set("frequency", formValues.frequency);
    fd.set("coverage", formValues.coverage || "0");

    if (isLifePolicy) {
      if (formValues.premiumStartDate) {
        fd.set("premiumStartDate", formValues.premiumStartDate);
      }
      const premiumEndDate = resolvePremiumEndDate(formValues);
      if (premiumEndDate) {
        fd.set("premiumEndDate", premiumEndDate);
      }
      if (formValues.validTill) {
        fd.set("validTill", formValues.validTill);
      }
    } else if (formValues.renewalDate) {
      fd.set("renewalDate", formValues.renewalDate);
    }

    return fd;
  }

  const resolvedTriggerLabel =
    triggerLabel ?? (isEdit ? "Edit" : "Add policy");

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger
        render={
          <Button
            variant={isEdit ? "ghost" : "default"}
            size={isEdit ? "sm" : "default"}
            className={isEdit ? "min-h-11 px-2.5 text-muted-foreground md:px-3" : undefined}
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
        className="flex h-[92dvh] max-h-[92dvh] flex-col gap-0 rounded-t-2xl p-0 md:h-auto md:max-h-[88dvh]"
      >
        <div className="mx-auto mt-3 h-1 w-10 shrink-0 rounded-full bg-border md:hidden" />
        <SheetHeader className="shrink-0 border-b border-border px-5 py-4 md:px-6 md:py-5">
          <SheetTitle className="font-heading text-xl">
            {isEdit ? "Edit policy" : "Add policy"}
          </SheetTitle>
          <SheetDescription className="text-sm leading-relaxed">
            {isLifePolicy
              ? "Track when premiums started, when they end, and how long coverage stays valid."
              : "Track premium, coverage amount, and renewal date so nothing slips through."}
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
                <Label htmlFor="insurance-name">Policy name</Label>
                <Input
                  id="insurance-name"
                  className={FIELD_CLASS}
                  value={formValues.name}
                  onChange={(e) => patchForm({ name: e.target.value })}
                  placeholder="e.g. Term life cover"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="insurance-provider">Provider</Label>
                <Input
                  id="insurance-provider"
                  className={FIELD_CLASS}
                  value={formValues.provider}
                  onChange={(e) => patchForm({ provider: e.target.value })}
                  placeholder="e.g. LIC, HDFC Life"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="insurance-type">Type</Label>
                  <LabeledSelect
                    id="insurance-type"
                    value={formValues.type}
                    onValueChange={(value) =>
                      patchForm({ type: value as InsuranceType })
                    }
                    options={INSURANCE_TYPES.map((value) => ({
                      value,
                      label: formatInsuranceType(value),
                    }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="insurance-frequency">Frequency</Label>
                  <LabeledSelect
                    id="insurance-frequency"
                    value={formValues.frequency}
                    onValueChange={(value) =>
                      patchForm({ frequency: value as Frequency })
                    }
                    options={FREQUENCIES.map((value) => ({
                      value,
                      label: formatFrequency(value),
                    }))}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="insurance-premium">Premium (₹)</Label>
                  <MoneyInput
                    id="insurance-premium"
                    className={FIELD_CLASS}
                    value={formValues.premium}
                    onChange={(e) => patchForm({ premium: e.target.value })}
                    placeholder="e.g. 12000"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="insurance-coverage">Coverage (₹)</Label>
                  <MoneyInput
                    id="insurance-coverage"
                    className={FIELD_CLASS}
                    value={formValues.coverage}
                    onChange={(e) => patchForm({ coverage: e.target.value })}
                    placeholder="e.g. 10000000"
                  />
                </div>
              </div>

              {isLifePolicy ? (
                <div className="space-y-4 rounded-xl border border-border bg-muted/20 p-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Payment & validity</p>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      When you started paying, till when premiums are due, and
                      till when the policy stays valid.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="insurance-premium-start">
                      Started paying on
                    </Label>
                    <DatePicker
                      id="insurance-premium-start"
                      value={formValues.premiumStartDate}
                      onChange={(value) =>
                        patchForm({ premiumStartDate: value })
                      }
                      className={FIELD_CLASS}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Label htmlFor="insurance-premium-end">
                        Paying premiums until
                      </Label>
                      <div className="inline-flex rounded-lg bg-muted p-0.5 text-xs">
                        {(
                          [
                            ["date", "End date"],
                            ["tenure", "Tenure"],
                          ] as const
                        ).map(([mode, label]) => (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => patchForm({ premiumEndMode: mode })}
                            className={`rounded-md px-2.5 py-1 transition-colors ${
                              formValues.premiumEndMode === mode
                                ? "bg-background text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                    {formValues.premiumEndMode === "date" ? (
                      <DatePicker
                        id="insurance-premium-end"
                        value={formValues.premiumEndDate}
                        onChange={(value) =>
                          patchForm({ premiumEndDate: value })
                        }
                        className={FIELD_CLASS}
                      />
                    ) : (
                      <>
                        <Input
                          id="insurance-premium-end"
                          type="number"
                          min={1}
                          step={1}
                          inputMode="numeric"
                          className={FIELD_CLASS}
                          value={formValues.premiumTenureYears}
                          onChange={(e) =>
                            patchForm({ premiumTenureYears: e.target.value })
                          }
                          placeholder="e.g. 10 (years)"
                        />
                        <p className="text-xs leading-relaxed text-muted-foreground">
                          {formValues.premiumTenureYears &&
                          Number(formValues.premiumTenureYears) > 0
                            ? `Premiums end on ${formatDate(resolvePremiumEndDate(formValues))}, counted from the start date${
                                formValues.premiumStartDate ? "" : " (today)"
                              }.`
                            : "Counted from the start date above (or today, if blank)."}
                        </p>
                      </>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="insurance-valid-till">
                      Policy valid until
                    </Label>
                    <DatePicker
                      id="insurance-valid-till"
                      value={formValues.validTill}
                      onChange={(value) => patchForm({ validTill: value })}
                      className={FIELD_CLASS}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="insurance-renewal">Renewal date</Label>
                  <DatePicker
                    id="insurance-renewal"
                    value={formValues.renewalDate}
                    onChange={(value) => patchForm({ renewalDate: value })}
                    className={FIELD_CLASS}
                  />
                </div>
              )}
            </div>

            <SheetFooter className="shrink-0 border-t border-border bg-muted/25 px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] md:px-6">
              <Button type="submit" className="h-11 w-full" disabled={pending}>
                {pending ? "Saving..." : "Save changes"}
              </Button>
            </SheetFooter>
          </form>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
