"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatEnumLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface LabeledSelectOption {
  value: string;
  label: string;
}

interface LabeledSelectProps {
  id?: string;
  value: string;
  onValueChange: (value: string) => void;
  options: LabeledSelectOption[];
  placeholder?: string;
  className?: string;
  "aria-label"?: string;
}

export function LabeledSelect({
  id,
  value,
  onValueChange,
  options,
  placeholder = "Select an option",
  className,
  "aria-label": ariaLabel,
}: LabeledSelectProps) {
  const selectedLabel =
    options.find((option) => option.value === value)?.label ??
    (value ? formatEnumLabel(value) : placeholder);

  return (
    <Select value={value} onValueChange={(next) => next && onValueChange(next)}>
      <SelectTrigger
        id={id}
        className={cn("w-full", className)}
        aria-label={ariaLabel}
      >
        <span
          className={cn(
            "flex-1 truncate text-left",
            !value && "text-faint font-medium"
          )}
        >
          {selectedLabel}
        </span>
        <SelectValue className="sr-only">{selectedLabel}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
