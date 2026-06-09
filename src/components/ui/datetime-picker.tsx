"use client";

import { useRef } from "react";
import { CalendarIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface DateTimePickerProps {
  id?: string;
  name?: string;
  defaultValue?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export function DateTimePicker({
  id,
  name,
  defaultValue,
  required,
  disabled,
  className,
}: DateTimePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function openPicker() {
    if (disabled) return;
    const input = inputRef.current;
    if (!input) return;
    input.focus();
    if (typeof input.showPicker === "function") {
      try {
        input.showPicker();
      } catch {
        // Some browsers throw if showPicker is not allowed in this context.
      }
    }
  }

  return (
    <div
      className={cn(
        "relative w-full cursor-pointer",
        "[&_input::-webkit-calendar-picker-indicator]:absolute",
        "[&_input::-webkit-calendar-picker-indicator]:inset-0",
        "[&_input::-webkit-calendar-picker-indicator]:h-full",
        "[&_input::-webkit-calendar-picker-indicator]:w-full",
        "[&_input::-webkit-calendar-picker-indicator]:cursor-pointer",
        "[&_input::-webkit-calendar-picker-indicator]:opacity-0",
        disabled && "pointer-events-none opacity-50"
      )}
      onClick={openPicker}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openPicker();
        }
      }}
      role="presentation"
    >
      <Input
        ref={inputRef}
        id={id}
        name={name}
        type="datetime-local"
        defaultValue={defaultValue}
        required={required}
        disabled={disabled}
        className={cn("h-8 cursor-pointer pr-9", className)}
        onClick={(event) => {
          event.stopPropagation();
          openPicker();
        }}
      />
      <CalendarIcon className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}
