"use client";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { groupIndianDigits, sanitizeAmountInput } from "@/lib/format";

interface MoneyInputProps extends React.ComponentProps<typeof Input> {
  label?: string;
  /** Allow negative amounts (overdraft, credit balances, etc.) */
  allowNegative?: boolean;
}

export function MoneyInput({
  className,
  label,
  id,
  allowNegative = false,
  value,
  onChange,
  // `min`/`step`/`type` are intentionally pulled out and dropped — the field
  // renders as formatted text, so they no longer apply.
  min,
  step,
  type,
  ...props
}: MoneyInputProps) {
  void min;
  void step;
  void type;
  const inputId = id ?? "money-input";
  const rawValue = value === undefined || value === null ? "" : String(value);
  const displayValue = groupIndianDigits(rawValue);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const el = e.target;
    const typed = el.value;
    const caret = el.selectionStart ?? typed.length;
    // Count meaningful chars left of the caret so it can be restored after
    // separators are re-inserted.
    const significantLeft = typed.slice(0, caret).replace(/[^0-9.-]/g, "").length;

    const sanitized = sanitizeAmountInput(typed, allowNegative);
    const formatted = groupIndianDigits(sanitized);

    let pos = 0;
    let seen = 0;
    while (pos < formatted.length && seen < significantLeft) {
      if (/[0-9.-]/.test(formatted[pos]!)) seen += 1;
      pos += 1;
    }

    // Hand the clean numeric string to the consumer's onChange.
    el.value = sanitized;
    onChange?.(e);

    requestAnimationFrame(() => {
      if (document.activeElement === el) {
        el.setSelectionRange(pos, pos);
      }
    });
  }

  return (
    <div className="relative">
      {label ? (
        <label htmlFor={inputId} className="sr-only">
          {label}
        </label>
      ) : null}
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">
        ₹
      </span>
      <Input
        id={inputId}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={displayValue}
        onChange={handleChange}
        className={cn("pl-8 tabular-nums", className)}
        {...props}
      />
    </div>
  );
}
