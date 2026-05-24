import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

interface MoneyInputProps extends React.ComponentProps<typeof Input> {
  label?: string;
}

export function MoneyInput({ className, label, id, ...props }: MoneyInputProps) {
  const inputId = id ?? "money-input";

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
        min={0}
        step={100}
        className={cn("pl-7 tabular-nums", className)}
        {...props}
      />
    </div>
  );
}
