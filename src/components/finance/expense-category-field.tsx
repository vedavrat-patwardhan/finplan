"use client";

import { useMemo, useState } from "react";
import { EXPENSE_CATEGORIES } from "@/lib/finance/constants";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LabeledSelect } from "@/components/ui/labeled-select";

const CUSTOM_VALUE = "__custom__";

export function ExpenseCategoryField({
  id,
  name,
  defaultValue = "Miscellaneous",
  required = true,
}: {
  id?: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
}) {
  const presetValues = useMemo(() => [...EXPENSE_CATEGORIES], []);
  const initialIsCustom = defaultValue
    ? !presetValues.includes(defaultValue as (typeof EXPENSE_CATEGORIES)[number])
    : false;

  const [mode, setMode] = useState(initialIsCustom ? CUSTOM_VALUE : defaultValue);
  const [customValue, setCustomValue] = useState(initialIsCustom ? defaultValue : "");

  const submittedValue = mode === CUSTOM_VALUE ? customValue.trim() : mode;

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{name === "category" ? "Category" : name}</Label>
      <LabeledSelect
        id={id}
        value={mode}
        onValueChange={setMode}
        options={[
          ...presetValues.map((category) => ({ value: category, label: category })),
          { value: CUSTOM_VALUE, label: "Custom category…" },
        ]}
        aria-label="Expense category"
      />
      {mode === CUSTOM_VALUE ? (
        <Input
          value={customValue}
          onChange={(event) => setCustomValue(event.target.value)}
          placeholder="e.g. Childcare, Pets, Education"
          maxLength={50}
          required={required}
        />
      ) : null}
      <input type="hidden" name={name} value={submittedValue} required={required} />
    </div>
  );
}
