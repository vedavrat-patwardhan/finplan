"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { filterIndianBanks } from "@/lib/finance/indian-banks";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function BankCombobox({
  id,
  label,
  value,
  onChange,
  placeholder = "Search or select a bank",
  required,
}: {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const filtered = filterIndianBanks(query);
  const showCustom =
    query.trim().length > 0 &&
    !filtered.some((b) => b.toLowerCase() === query.trim().toLowerCase());

  function selectBank(bank: string) {
    onChange(bank);
    setQuery(bank);
    setOpen(false);
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <button
              type="button"
              id={id}
              className={cn(
                "flex h-10 w-full cursor-pointer items-center justify-between gap-2 border border-input bg-input-bg px-3 text-[15px] font-semibold outline-none transition-colors focus-visible:border-foreground",
                !value && "text-faint font-medium"
              )}
            />
          }
        >
          <span className="truncate">{value || placeholder}</span>
          <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
        </PopoverTrigger>
        <PopoverContent className="w-[min(100vw-2rem,320px)] max-h-64 overflow-auto border border-border bg-popover p-1" align="start">
          <div className="-m-1 mb-1 border-b border-border p-2">
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                onChange(e.target.value);
              }}
              placeholder="Type to search banks..."
              autoComplete="off"
              className="h-8 text-sm"
              aria-controls={listId}
            />
          </div>
          <ul
            id={listId}
            role="listbox"
            className="overflow-y-auto"
            aria-label={label}
          >
            {showCustom ? (
              <li>
                <button
                  type="button"
                  role="option"
                  className="flex w-full cursor-pointer items-center gap-2 border-l-2 border-l-transparent px-3 py-2 text-left text-sm font-medium hover:bg-accent"
                  onClick={() => selectBank(query.trim())}
                >
                  Use &ldquo;{query.trim()}&rdquo;
                </button>
              </li>
            ) : null}
            {filtered.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-muted-foreground">
                No banks match. Keep typing to use a custom name.
              </li>
            ) : (
              filtered.map((bank) => (
                <li key={bank}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={value === bank}
                    className={cn(
                      "flex w-full cursor-pointer items-center gap-2 border-l-2 border-l-transparent px-3 py-2 text-left text-sm font-medium hover:bg-accent",
                      value === bank && "border-l-brand bg-accent"
                    )}
                    onClick={() => selectBank(bank)}
                  >
                    <Check
                      className={cn(
                        "size-4 shrink-0",
                        value === bank ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="truncate">{bank}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </PopoverContent>
      </Popover>
      <input type="hidden" name="institution" value={value} required={required} />
    </div>
  );
}
