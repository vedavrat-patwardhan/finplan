"use client";

import { useActionState, useEffect, useMemo, useRef, useState, startTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateTimePicker } from "@/components/ui/datetime-picker";
import { Label } from "@/components/ui/label";
import { LabeledSelect } from "@/components/ui/labeled-select";
import { MoneyInput } from "@/components/finance/money-input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import Link from "next/link";
import { createTransactionAction, updateTransactionAction } from "@/actions/ledger";
import type { LedgerTransactionDTO, PaymentAccountDTO } from "@/lib/db/queries/ledger";
import { cn } from "@/lib/utils";
import { pickPreferredAccountId, sortPaymentAccounts } from "@/lib/finance/ledger";
import { ChevronDown } from "lucide-react";

const LAST_ACCOUNT_KEY = "finplan-last-account";
const LAST_CATEGORY_KEY = "finplan-last-category";

function todayInputValue() {
  return toDatetimeLocalValue(new Date());
}

function toDatetimeLocalValue(value: string | Date) {
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function accountLabel(acc: PaymentAccountDTO) {
  const meta = [acc.institution, acc.lastFour ? `•••• ${acc.lastFour}` : null]
    .filter(Boolean)
    .join(" · ");
  const name = acc.isFavorite ? `★ ${acc.name}` : acc.name;
  return meta ? `${name} · ${meta}` : name;
}

export function QuickTransactionSheet({
  accounts,
  categories,
  open,
  onOpenChange,
  transaction,
}: {
  accounts: PaymentAccountDTO[];
  categories: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction?: LedgerTransactionDTO | null;
}) {
  const router = useRouter();
  const isEdit = Boolean(transaction);
  const action = isEdit ? updateTransactionAction : createTransactionAction;
  const [state, formAction, pending] = useActionState(action, {
    success: false,
  });
  const wasPending = useRef(false);

  const sortedAccounts = useMemo(() => sortPaymentAccounts(accounts), [accounts]);

  const defaultAccount =
    typeof window !== "undefined"
      ? pickPreferredAccountId(sortedAccounts, localStorage.getItem(LAST_ACCOUNT_KEY))
      : pickPreferredAccountId(sortedAccounts);

  const [accountId, setAccountId] = useState(transaction?.accountId ?? defaultAccount);
  const [amount, setAmount] = useState(transaction ? String(transaction.amount) : "");
  const [category, setCategory] = useState(() =>
    transaction?.category ?? (typeof window !== "undefined"
      ? categories.includes(localStorage.getItem(LAST_CATEGORY_KEY) ?? "")
        ? localStorage.getItem(LAST_CATEGORY_KEY)!
        : "Food"
      : "Food")
  );
  const [txType, setTxType] = useState<"debit" | "credit">(transaction?.type ?? "debit");
  const [showDate, setShowDate] = useState(Boolean(transaction));
  const [dateValue, setDateValue] = useState(() =>
    transaction ? toDatetimeLocalValue(transaction.date) : todayInputValue()
  );

  useEffect(() => {
    if (wasPending.current && !pending) {
      if (state.success) {
        onOpenChange(false);
        router.refresh();
        toast.success(isEdit ? "Transaction updated" : "Transaction saved");
      } else if (state.error) {
        toast.error(state.error);
      }
    }
    wasPending.current = pending;
  }, [pending, state.success, state.error, onOpenChange, router, isEdit]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!accountId) {
      toast.error("Add a payment account first");
      return;
    }
    if (!isEdit) {
      localStorage.setItem(LAST_ACCOUNT_KEY, accountId);
      localStorage.setItem(LAST_CATEGORY_KEY, category);
    }
    const fd = new FormData(e.currentTarget);
    const selectedDate = new Date(dateValue);
    if (Number.isNaN(selectedDate.getTime())) {
      toast.error("Choose a valid transaction date");
      return;
    }
    fd.set("accountId", accountId);
    fd.set("amount", amount);
    fd.set("type", txType);
    fd.set("category", category);
    fd.set("date", selectedDate.toISOString());
    startTransition(() => formAction(fd));
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="flex h-[92dvh] max-h-[92dvh] flex-col gap-0 p-0 md:h-auto md:max-h-[92dvh]"
      >
        <div className="mx-auto mt-3 h-1 w-10 shrink-0 bg-border" />
        <SheetHeader className="shrink-0 border-b border-border px-5 py-4">
          <SheetTitle className="text-xl">
            {isEdit ? "Edit transaction" : "Add transaction"}
          </SheetTitle>
          <SheetDescription>
            {isEdit
              ? "Update amount, category, account, or date for this entry."
              : "Log a purchase or payment in seconds"}
          </SheetDescription>
        </SheetHeader>

        {sortedAccounts.length === 0 ? (
          <div className="space-y-4 px-5 py-8 text-center text-sm text-muted-foreground">
            <p>Add a card or bank account before logging transactions.</p>
            <Button render={<Link href="/accounts" />}>Set up accounts</Button>
          </div>
        ) : open ? (
          <form
            key={transaction?.id ?? "new"}
            onSubmit={handleSubmit}
            className="flex min-h-0 flex-1 flex-col"
          >
            {transaction ? <input type="hidden" name="id" value={transaction.id} /> : null}

            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
              <div className="flex gap-2">
                {(["debit", "credit"] as const).map((t) => (
                  <Button
                    key={t}
                    type="button"
                    variant={txType === t ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setTxType(t)}
                  >
                    {t === "debit" ? "Expense" : "Income"}
                  </Button>
                ))}
              </div>

              <div className="space-y-2">
                <Label htmlFor="quick-amount">Amount (₹)</Label>
                <MoneyInput
                  id="quick-amount"
                  inputMode="decimal"
                  placeholder="e.g. 450"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  autoFocus={!isEdit}
                  className="h-14 text-3xl font-extrabold"
                />
              </div>

              <div className="space-y-2">
                <Label>Category</Label>
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={cn(
                        "np-caps h-8 shrink-0 border px-3 text-[10px] transition-colors",
                        category === cat
                          ? "border-foreground bg-foreground text-background"
                          : "border-input text-foreground hover:bg-accent"
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quick-account">Payment account</Label>
                <LabeledSelect
                  id="quick-account"
                  value={accountId}
                  onValueChange={(value) => setAccountId(value)}
                  options={sortedAccounts.map((acc) => ({
                    value: acc.id,
                    label: accountLabel(acc),
                  }))}
                  placeholder="Choose account"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="quick-merchant">Merchant / note</Label>
                <Input
                  id="quick-merchant"
                  name="merchant"
                  placeholder="e.g. Movie tickets, DMart"
                  defaultValue={transaction?.merchant ?? ""}
                />
              </div>

              <button
                type="button"
                onClick={() => setShowDate((v) => !v)}
                className="flex h-10 w-full items-center justify-between border border-border px-3 text-sm text-muted-foreground"
              >
                <span>{showDate ? "Hide date" : "Change date (defaults to now)"}</span>
                <ChevronDown
                  className={cn("size-4 transition-transform", showDate && "rotate-180")}
                />
              </button>
              {showDate ? (
                <div className="space-y-2">
                  <Label htmlFor="quick-date">Date & time</Label>
                  <DateTimePicker
                    id="quick-date"
                    name="date"
                    value={dateValue}
                    onChange={(event) => setDateValue(event.target.value)}
                    required
                  />
                </div>
              ) : (
                <input type="hidden" name="date" value={dateValue} />
              )}

              <input
                type="hidden"
                name="description"
                value={transaction?.description ?? ""}
              />
            </div>

            <SheetFooter className="shrink-0 border-t border-border bg-muted px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
              <Button type="submit" variant="brand" size="lg" className="w-full" disabled={pending}>
                {pending ? "Saving..." : isEdit ? "Save changes" : "Save transaction"}
              </Button>
            </SheetFooter>
          </form>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
