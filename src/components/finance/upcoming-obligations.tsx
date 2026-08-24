"use client";

import { startTransition, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CircleCheck, Link2, Plus, SkipForward } from "lucide-react";
import { toast } from "sonner";
import { payObligationAction, skipObligationAction } from "@/actions/obligations";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DateTimePicker } from "@/components/ui/datetime-picker";
import { Label } from "@/components/ui/label";
import { LabeledSelect } from "@/components/ui/labeled-select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { LEDGER_CATEGORIES, type LedgerCategory } from "@/lib/finance/constants";
import { formatDate, formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { LedgerTransactionDTO, PaymentAccountDTO } from "@/lib/db/queries/ledger";

export interface UpcomingObligationItem {
  sourceId: string;
  name: string;
  amount: number;
  dueDate: string;
  type: "insurance" | "expense" | "investment" | "income" | "credit_card_bill";
}

const obligationTypeStyles: Record<UpcomingObligationItem["type"], string> = {
  investment: "border-l-chart-1 bg-chart-1/5",
  insurance: "border-l-chart-2 bg-chart-2/5",
  expense: "border-l-chart-3 bg-chart-3/5",
  income: "border-l-chart-6 bg-chart-6/5",
  credit_card_bill: "border-l-chart-4 bg-chart-4/5",
};

const categoryOptions = LEDGER_CATEGORIES.map((category) => ({
  value: category,
  label: category,
}));

function defaultCategory(type: UpcomingObligationItem["type"]): LedgerCategory {
  if (type === "investment") return "Investment";
  if (type === "insurance") return "Healthcare";
  if (type === "credit_card_bill") return "Transfer";
  if (type === "income") return "Income";
  return "Miscellaneous";
}

function nowInputValue() {
  const date = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function typeLabel(type: UpcomingObligationItem["type"]) {
  return type === "credit_card_bill" ? "Credit card bill" : type;
}

export function ObligationList({
  obligations,
  transactions,
  accounts,
  emptyMessage = "Nothing due soon — monthly SIPs and half-yearly investments appear here before their next payment date.",
}: {
  obligations: UpcomingObligationItem[];
  transactions: LedgerTransactionDTO[];
  accounts: PaymentAccountDTO[];
  emptyMessage?: string;
}) {
  const router = useRouter();
  const [paying, setPaying] = useState<UpcomingObligationItem | null>(null);
  const [skipping, setSkipping] = useState<UpcomingObligationItem | null>(null);
  const [mode, setMode] = useState<"link" | "create">("link");
  const [transactionId, setTransactionId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [category, setCategory] = useState<LedgerCategory>("Miscellaneous");
  const [pending, setPending] = useState(false);

  const linkableTransactions = useMemo(() => {
    if (!paying) return [];
    const expectedType = paying.type === "income" ? "credit" : "debit";
    return transactions
      .filter((transaction) => transaction.type === expectedType)
      .toSorted((a, b) => {
        const amountDifference =
          Math.abs(a.amount - paying.amount) - Math.abs(b.amount - paying.amount);
        return amountDifference || new Date(b.date).getTime() - new Date(a.date).getTime();
      });
  }, [paying, transactions]);

  const transactionOptions = linkableTransactions.map((transaction) => ({
    value: transaction.id,
    label: `${formatINR(transaction.amount)} · ${transaction.merchant || transaction.description || transaction.category} · ${formatDate(transaction.date)}`,
  }));
  const payableAccounts =
    paying?.type === "credit_card_bill"
      ? accounts.filter((account) => !["credit_card", "debit_card"].includes(account.type))
      : accounts.filter((account) => account.type !== "debit_card");
  const accountOptions = payableAccounts.map((account) => ({
    value: account.id,
    label: `${account.name}${account.lastFour ? ` · •••• ${account.lastFour}` : ""}`,
  }));

  function openPay(item: UpcomingObligationItem) {
    const matching = transactions.find(
      (transaction) =>
        transaction.type === (item.type === "income" ? "credit" : "debit") &&
        Math.abs(transaction.amount - item.amount) < 0.01
    );
    setMode(matching ? "link" : "create");
    setTransactionId(matching?.id ?? "");
    const firstPayableAccount =
      item.type === "credit_card_bill"
        ? accounts.find((account) => !["credit_card", "debit_card"].includes(account.type))
        : accounts.find((account) => account.type !== "debit_card");
    setAccountId(firstPayableAccount?.id ?? "");
    setCategory(defaultCategory(item.type));
    setPaying(item);
  }

  function identityFormData(item: UpcomingObligationItem) {
    const formData = new FormData();
    formData.set("sourceType", item.type);
    formData.set("sourceId", item.sourceId);
    formData.set("dueDate", item.dueDate);
    return formData;
  }

  function handleSkip() {
    if (!skipping) return;
    const item = skipping;
    setPending(true);
    startTransition(async () => {
      const result = await skipObligationAction(identityFormData(item));
      setPending(false);
      if (!result.success) {
        toast.error(result.error ?? "Could not skip obligation");
        return;
      }
      setSkipping(null);
      router.refresh();
      toast.success(`${item.name} skipped for this due date`);
    });
  }

  function handlePay(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!paying) return;
    if (mode === "link" && !transactionId) {
      toast.error("Select a ledger transaction");
      return;
    }
    if (mode === "create" && !accountId) {
      toast.error("Select a payment account");
      return;
    }

    const formData = new FormData(event.currentTarget);
    formData.set("sourceType", paying.type);
    formData.set("sourceId", paying.sourceId);
    formData.set("dueDate", paying.dueDate);
    formData.set("mode", mode);
    formData.set("transactionId", transactionId);
    formData.set("accountId", accountId);
    formData.set("category", category);
    setPending(true);
    startTransition(async () => {
      const result = await payObligationAction(formData);
      setPending(false);
      if (!result.success) {
        toast.error(result.error ?? "Could not mark obligation paid");
        return;
      }
      setPaying(null);
      router.refresh();
      toast.success(
        result.createdTransaction
          ? "Paid and added to the ledger"
          : "Paid and linked to the ledger"
      );
    });
  }

  if (obligations.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {emptyMessage}
      </p>
    );
  }

  return (
    <>
      <div className="list-stack">
        {obligations.map((item) => (
          <article
            key={`${item.type}-${item.sourceId}-${item.dueDate}`}
            className={cn(
              "rounded-xl border border-border border-l-[3px] px-4 py-3",
              obligationTypeStyles[item.type]
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{item.name}</p>
                <p className="text-xs capitalize text-muted-foreground">
                  {typeLabel(item.type)} · {formatDate(item.dueDate)}
                </p>
              </div>
              <p className="shrink-0 text-sm font-medium tabular-nums">
                {formatINR(item.amount, { compact: true })}
              </p>
            </div>
            <div className="mt-3 flex justify-end gap-2 border-t border-border/70 pt-3">
              <Button
                type="button"
                variant="ghost"
                className="min-h-11 gap-2 text-muted-foreground"
                onClick={() => setSkipping(item)}
              >
                <SkipForward className="size-4" />
                Skip
              </Button>
              <Button
                type="button"
                variant="outline"
                className="min-h-11 gap-2 border-success/40 text-success hover:bg-success/10 hover:text-success"
                onClick={() => openPay(item)}
              >
                <CircleCheck className="size-4" />
                Paid
              </Button>
            </div>
          </article>
        ))}
      </div>

      <Dialog open={Boolean(skipping)} onOpenChange={(open) => !open && setSkipping(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Skip this payment?</DialogTitle>
            <DialogDescription>
              {skipping
                ? `${skipping.name} will be hidden only for ${formatDate(skipping.dueDate)}. Future payments remain scheduled.`
                : "This due payment will be skipped."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setSkipping(null)} disabled={pending}>
              Keep pending
            </Button>
            <Button onClick={handleSkip} disabled={pending}>
              {pending ? "Skipping…" : "Skip this payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={Boolean(paying)} onOpenChange={(open) => !open && setPaying(null)}>
        <SheetContent
          side="bottom"
          className="flex max-h-[92dvh] flex-col gap-0 rounded-t-2xl p-0 sm:inset-y-0 sm:right-0 sm:left-auto sm:h-full sm:max-h-none sm:w-[30rem] sm:rounded-none sm:border-t-0 sm:border-l"
        >
          <div className="mx-auto mt-3 h-1 w-10 shrink-0 rounded-full bg-border sm:hidden" />
          <SheetHeader className="border-b border-border px-5 py-4">
            <SheetTitle className="font-heading text-xl">Mark as paid</SheetTitle>
            <SheetDescription>
              {paying
                ? `${paying.name} · ${formatINR(paying.amount)} due ${formatDate(paying.dueDate)}`
                : "Link or create a ledger entry."}
            </SheetDescription>
          </SheetHeader>

          {paying ? (
            <form onSubmit={handlePay} className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
                <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted p-1">
                  <button
                    type="button"
                    className={cn(
                      "flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors",
                      mode === "link" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                    )}
                    onClick={() => setMode("link")}
                  >
                    <Link2 className="size-4" /> Link ledger
                  </button>
                  <button
                    type="button"
                    className={cn(
                      "flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors",
                      mode === "create" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                    )}
                    onClick={() => setMode("create")}
                  >
                    <Plus className="size-4" /> Create entry
                  </button>
                </div>

                {mode === "link" ? (
                  <div className="space-y-2">
                    <Label htmlFor="obligation-transaction">Ledger transaction</Label>
                    <LabeledSelect
                      id="obligation-transaction"
                      value={transactionId}
                      onValueChange={setTransactionId}
                      options={transactionOptions}
                      placeholder={
                        transactionOptions.length > 0
                          ? "Select transaction"
                          : "No matching ledger transactions"
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Closest amount matches appear first. Linking does not change the account balance again.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="obligation-account">Payment account</Label>
                      <LabeledSelect
                        id="obligation-account"
                        value={accountId}
                        onValueChange={setAccountId}
                        options={accountOptions}
                        placeholder="Select account"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="obligation-paid-at">Paid on</Label>
                      <DateTimePicker
                        id="obligation-paid-at"
                        name="transactionDate"
                        defaultValue={nowInputValue()}
                        required
                      />
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label htmlFor="obligation-category">Ledger category</Label>
                  <LabeledSelect
                    id="obligation-category"
                    value={category}
                    onValueChange={(value) => setCategory(value as LedgerCategory)}
                    options={categoryOptions}
                  />
                </div>

                <div className="rounded-xl border border-success/25 bg-success/[0.06] px-4 py-3 text-xs leading-relaxed text-muted-foreground">
                  Marking paid removes this obligation from the dashboard. Investment totals or insurance premium history update automatically.
                </div>
              </div>

              <SheetFooter className="border-t border-border bg-muted/20 px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
                <Button type="submit" className="h-11 w-full" disabled={pending}>
                  {pending ? "Saving payment…" : mode === "link" ? "Link and mark paid" : "Create and mark paid"}
                </Button>
              </SheetFooter>
            </form>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}
