"use client";

import { useActionState, useEffect, useMemo, useRef, useState, startTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateTimePicker } from "@/components/ui/datetime-picker";
import { Label } from "@/components/ui/label";
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
import { QUICK_TRANSACTION_CATEGORIES } from "@/lib/finance/constants";
import type { LedgerTransactionDTO, PaymentAccountDTO } from "@/lib/db/queries/ledger";
import { cn } from "@/lib/utils";
import { pickPreferredAccountId, sortPaymentAccounts } from "@/lib/finance/ledger";
import { ChevronDown, Star } from "lucide-react";

const LAST_ACCOUNT_KEY = "finplan-last-account";
const LAST_CATEGORY_KEY = "finplan-last-category";

function todayInputValue() {
  const d = new Date();
  return d.toISOString().slice(0, 16);
}

function toDatetimeLocalValue(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function QuickTransactionSheet({
  accounts,
  open,
  onOpenChange,
  transaction,
}: {
  accounts: PaymentAccountDTO[];
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

  const [accountId, setAccountId] = useState(defaultAccount);
  const [amount, setAmount] = useState(transaction ? String(transaction.amount) : "");
  const [category, setCategory] = useState(
    typeof window !== "undefined"
      ? localStorage.getItem(LAST_CATEGORY_KEY) ?? "Food"
      : "Food"
  );
  const [txType, setTxType] = useState<"debit" | "credit">("debit");
  const [showDate, setShowDate] = useState(false);
  const wasOpen = useRef(false);

  useEffect(() => {
    const justOpened = open && !wasOpen.current;
    wasOpen.current = open;

    if (!justOpened || sortedAccounts.length === 0) return;

    if (transaction) {
      setAccountId(transaction.accountId);
      setAmount(String(transaction.amount));
      setCategory(transaction.category);
      setTxType(transaction.type);
      setShowDate(true);
      return;
    }

    const stored = localStorage.getItem(LAST_ACCOUNT_KEY);
    setAccountId(pickPreferredAccountId(sortedAccounts, stored));
    setAmount("");
    setCategory(localStorage.getItem(LAST_CATEGORY_KEY) ?? "Food");
    setTxType("debit");
    setShowDate(false);
  }, [open, sortedAccounts, transaction]);

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
    fd.set("accountId", accountId);
    fd.set("amount", amount);
    fd.set("type", txType);
    fd.set("category", category);
    startTransition(() => formAction(fd));
  }

  const dateValue = transaction ? toDatetimeLocalValue(transaction.date) : todayInputValue();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="flex h-[92dvh] max-h-[92dvh] flex-col gap-0 rounded-t-2xl p-0 md:h-auto md:max-h-[92dvh]"
      >
        <div className="mx-auto mt-3 h-1 w-10 shrink-0 rounded-full bg-border" />
        <SheetHeader className="shrink-0 border-b border-border px-5 py-4">
          <SheetTitle className="font-heading text-xl">
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
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTxType(t)}
                    className={cn(
                      "min-h-11 flex-1 rounded-lg border px-3 py-2 text-sm font-medium capitalize transition-colors",
                      txType === t
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:bg-muted/40"
                    )}
                  >
                    {t === "debit" ? "Expense" : "Income"}
                  </button>
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
                  className="h-12 text-lg"
                />
              </div>

              <div className="space-y-2">
                <Label>Category</Label>
                <div className="flex flex-wrap gap-2">
                  {QUICK_TRANSACTION_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={cn(
                        "min-h-11 shrink-0 rounded-full border px-4 py-2 text-sm transition-colors",
                        category === cat
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-muted/30 text-foreground hover:bg-muted/60"
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Payment account</Label>
                <div className="flex flex-wrap gap-2">
                  {sortedAccounts.map((acc) => (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => setAccountId(acc.id)}
                      className={cn(
                        "min-h-11 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                        accountId === acc.id
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:bg-muted/40"
                      )}
                    >
                      <span className="flex items-center gap-1.5 font-medium">
                        {acc.isFavorite ? (
                          <Star className="size-3.5 shrink-0 fill-chart-3 text-chart-3" />
                        ) : null}
                        {acc.name}
                      </span>
                      {(acc.institution || acc.lastFour) && (
                        <span className="block text-xs text-muted-foreground">
                          {[acc.institution, acc.lastFour ? `•••• ${acc.lastFour}` : null]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
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
                className="flex min-h-11 w-full items-center justify-between rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground"
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
                    defaultValue={dateValue}
                    required
                  />
                </div>
              ) : (
                <input type="hidden" name="date" value={todayInputValue()} />
              )}

              <input
                type="hidden"
                name="description"
                value={transaction?.description ?? ""}
              />
            </div>

            <SheetFooter className="shrink-0 border-t border-border bg-muted/25 px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
              <Button type="submit" className="h-11 w-full text-base" disabled={pending}>
                {pending ? "Saving..." : isEdit ? "Save changes" : "Save transaction"}
              </Button>
            </SheetFooter>
          </form>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
