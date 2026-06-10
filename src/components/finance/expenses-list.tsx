"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import {
  createExpenseAction,
  deleteExpenseAction,
  updateExpenseAction,
} from "@/actions/finance";
import { expenseFormFields } from "@/lib/form-fields";
import {
  ResourceFormSheet,
  DeleteButton,
} from "@/components/finance/resource-form-sheet";
import { ResourceList, ResourceRow } from "@/components/finance/resource-row";
import { Input } from "@/components/ui/input";
import { LabeledSelect } from "@/components/ui/labeled-select";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { formatINR, formatEnumLabel, formatFrequency } from "@/lib/format";
import { formatExpenseClassLabel } from "@/lib/finance/expense-classes";
import { toMonthlyEquivalent as calcMonthly } from "@/lib/finance/engine";
import type { Frequency } from "@/lib/finance/constants";

export type ExpenseListItem = {
  id: string;
  name: string;
  category: string;
  expenseClass: string;
  amount: number;
  frequency: Frequency;
  isEssential: boolean;
};

const sortOptions = [
  { value: "monthly-desc", label: "Monthly cost (high → low)" },
  { value: "monthly-asc", label: "Monthly cost (low → high)" },
  { value: "name-asc", label: "Name (A → Z)" },
  { value: "name-desc", label: "Name (Z → A)" },
  { value: "amount-desc", label: "Amount (high → low)" },
  { value: "amount-asc", label: "Amount (low → high)" },
  { value: "category-asc", label: "Category (A → Z)" },
] as const;

type SortValue = (typeof sortOptions)[number]["value"];

function sortExpenses(items: ExpenseListItem[], sort: SortValue): ExpenseListItem[] {
  const sorted = [...items];

  switch (sort) {
    case "monthly-desc":
      return sorted.sort(
        (a, b) =>
          calcMonthly(b.amount, b.frequency) - calcMonthly(a.amount, a.frequency)
      );
    case "monthly-asc":
      return sorted.sort(
        (a, b) =>
          calcMonthly(a.amount, a.frequency) - calcMonthly(b.amount, b.frequency)
      );
    case "name-desc":
      return sorted.sort((a, b) => b.name.localeCompare(a.name, "en-IN"));
    case "name-asc":
      return sorted.sort((a, b) => a.name.localeCompare(b.name, "en-IN"));
    case "amount-desc":
      return sorted.sort((a, b) => b.amount - a.amount);
    case "amount-asc":
      return sorted.sort((a, b) => a.amount - b.amount);
    case "category-asc":
      return sorted.sort((a, b) => {
        const byCategory = a.category.localeCompare(b.category, "en-IN");
        return byCategory !== 0 ? byCategory : a.name.localeCompare(b.name, "en-IN");
      });
    default:
      return sorted;
  }
}

function matchesSearch(item: ExpenseListItem, query: string) {
  const haystack = [
    item.name,
    item.category,
    formatExpenseClassLabel(item.expenseClass),
    item.isEssential ? "essential" : "optional",
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
}

export function ExpensesList({ items }: { items: ExpenseListItem[] }) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortValue>("monthly-desc");
  const debouncedSearch = useDebouncedValue(search.trim().toLowerCase(), 300);

  const visibleItems = useMemo(() => {
    const filtered = debouncedSearch
      ? items.filter((item) => matchesSearch(item, debouncedSearch))
      : items;
    return sortExpenses(filtered, sort);
  }, [items, debouncedSearch, sort]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, category, or type…"
            aria-label="Search expense budgets"
            className="h-10 pl-9"
          />
        </div>
        <LabeledSelect
          id="expense-sort"
          value={sort}
          onValueChange={(value) => setSort(value as SortValue)}
          options={[...sortOptions]}
          aria-label="Sort expense budgets"
          className="w-full sm:w-56"
        />
      </div>

      {visibleItems.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/15 px-6 py-10 text-center">
          <p className="font-heading text-base font-semibold">No matching budgets</p>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Try a different search term or clear the filter to see all items.
          </p>
        </div>
      ) : (
        <ResourceList>
          {visibleItems.map((item) => (
            <ResourceRow
              key={item.id}
              title={item.name}
              subtitle={
                <span>
                  {item.category} · {formatExpenseClassLabel(item.expenseClass)} ·{" "}
                  {item.isEssential ? "Essential" : "Optional"}
                </span>
              }
              amount={formatINR(item.amount)}
              amountSub={
                <span>
                  {formatFrequency(item.frequency)} ·{" "}
                  {formatINR(calcMonthly(item.amount, item.frequency), { compact: true })}/mo
                </span>
              }
              actions={
                <div className="flex items-center gap-1">
                  <ResourceFormSheet
                    title="Edit expense budget"
                    description="Update amount, category, or whether this is essential spending."
                    triggerLabel="Edit"
                    fields={expenseFormFields}
                    action={createExpenseAction}
                    updateAction={updateExpenseAction}
                    itemId={item.id}
                    defaultValues={{
                      name: item.name,
                      category: item.category,
                      expenseClass: item.expenseClass,
                      amount: String(item.amount),
                      frequency: item.frequency,
                      isEssential: String(item.isEssential),
                    }}
                  />
                  <DeleteButton
                    id={item.id}
                    action={deleteExpenseAction}
                    itemName={item.name}
                  />
                </div>
              }
            />
          ))}
        </ResourceList>
      )}
    </div>
  );
}
