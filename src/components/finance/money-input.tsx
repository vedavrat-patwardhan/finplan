import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

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
  min,
  step,
  ...props
}: MoneyInputProps) {
  const inputId = id ?? "money-input";
  const resolvedMin = min ?? (allowNegative ? undefined : 0);
  const resolvedStep = step ?? "any";

  return (
    <div className="relative">
      {label ? (
        <label htmlFor={inputId} className="sr-only">
          {label}
        </label>
      ) : null}
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
        ₹
      </span>
      <Input
        id={inputId}
        type="number"
        min={resolvedMin}
        step={resolvedStep}
        inputMode="decimal"
        className={cn("pl-7 tabular-nums", className)}
        {...props}
      />
    </div>
  );
}
