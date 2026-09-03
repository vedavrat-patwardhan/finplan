"use client";

import { useEffect, useState } from "react";
import { CalendarIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  formatDate,
  formatDateInputValue,
  parseDateInputValue,
} from "@/lib/format";
import { cn } from "@/lib/utils";

const DEFAULT_TO_YEAR = 2150;

interface DatePickerProps {
  id?: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  fromYear?: number;
  toYear?: number;
}

export function DatePicker({
  id,
  name,
  value,
  defaultValue = "",
  onChange,
  placeholder = "Pick a date",
  required = false,
  disabled = false,
  className,
  fromYear,
  toYear,
}: DatePickerProps) {
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);

  const dateValue = isControlled ? (value ?? "") : internalValue;
  const selectedDate = parseDateInputValue(dateValue);
  const currentYear = new Date().getFullYear();
  const rangeStart = new Date(fromYear ?? currentYear - 35, 0, 1);
  const rangeEnd = new Date(toYear ?? DEFAULT_TO_YEAR, 11, 31);

  useEffect(() => {
    if (!isControlled) {
      setInternalValue(defaultValue);
    }
  }, [defaultValue, isControlled]);

  function updateValue(next: string) {
    if (!isControlled) {
      setInternalValue(next);
    }
    onChange?.(next);
  }

  function handleSelect(date: Date | undefined) {
    updateValue(formatDateInputValue(date));
    if (date) {
      setOpen(false);
    }
  }

  function handleClear(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    updateValue("");
    setOpen(false);
  }

  function handleToday() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    updateValue(formatDateInputValue(today));
    setOpen(false);
  }

  function openCalendar() {
    if (!disabled) setOpen(true);
  }

  const displayValue = selectedDate ? formatDate(selectedDate) : placeholder;

  return (
    <>
      {name ? (
        <input
          type="hidden"
          name={name}
          value={dateValue}
          required={required && !dateValue}
        />
      ) : null}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          disabled={disabled}
          render={
            <button
              type="button"
              id={id}
              disabled={disabled}
              aria-haspopup="dialog"
              aria-expanded={open}
              onClick={openCalendar}
              className={cn(
                "flex h-10 w-full cursor-pointer items-center gap-2 border border-input bg-input-bg px-3 text-left text-base font-semibold transition-colors outline-none focus-visible:border-foreground focus-visible:outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-[15px]",
                !dateValue && "text-faint font-medium",
                className
              )}
            />
          }
        >
          <span className="min-w-0 flex-1 truncate text-sm">
            {displayValue}
          </span>
          {dateValue && !required ? (
            <span
              role="button"
              tabIndex={0}
              className="inline-flex size-6 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              onClick={handleClear}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  event.stopPropagation();
                  updateValue("");
                  setOpen(false);
                }
              }}
              aria-label="Clear date"
            >
              <X className="size-3.5" />
            </span>
          ) : null}
          <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
        </PopoverTrigger>

        <PopoverContent
          className="w-auto p-0"
          align="start"
          side="bottom"
          sideOffset={6}
        >
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleSelect}
            defaultMonth={selectedDate ?? new Date()}
            captionLayout="dropdown"
            startMonth={rangeStart}
            endMonth={rangeEnd}
            disabled={disabled}
          />
          <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-2.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2.5 text-muted-foreground"
              onClick={handleToday}
            >
              Today
            </Button>
            {!required ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2.5 text-muted-foreground"
                onClick={() => {
                  updateValue("");
                  setOpen(false);
                }}
                disabled={!dateValue}
              >
                Clear
              </Button>
            ) : null}
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
}

export function DatePickerField({
  id,
  name,
  label,
  value,
  defaultValue,
  onChange,
  placeholder,
  required,
  disabled,
  className,
  fromYear,
  toYear,
}: DatePickerProps & { label: string }) {
  const isRequired = required ?? false;

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        {!isRequired ? (
          <span className="ml-1.5 font-normal text-muted-foreground">(optional)</span>
        ) : null}
      </Label>
      <DatePicker
        id={id}
        name={name}
        value={value}
        defaultValue={defaultValue}
        onChange={onChange}
        placeholder={placeholder ?? `Select ${label.toLowerCase()}`}
        required={isRequired}
        disabled={disabled}
        className={className}
        fromYear={fromYear}
        toYear={toYear}
      />
    </div>
  );
}
