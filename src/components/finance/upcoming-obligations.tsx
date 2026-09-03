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
import { Badge } from "@/components/ui/badge";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatDate, formatINR } from "@/lib/format";
import type { LedgerTransactionDTO, PaymentAccountDTO } from "@/lib/db/queries/ledger";

export interface UpcomingObligationItem {
  sourceId: string;
  name: string;
  amount: number;
  dueDate: string;
  type: "insurance" | "expense" | "investment" | "income" | "credit_card_bill";
}

function defaultCategory(type: UpcomingObligationItem["type"]): string {
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

/** Days from today to the due date — negative when overdue. */
function daysUntilDue(dueDate: string): number {
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / 86_400_000);
}

export function ObligationList({
  obligations,
  transactions,
  accounts,
  categories,
  emptyMessage = "Nothing due soon — monthly SIPs and half-yearly investments appear here before their next payment date.",
}: {
  obligations: UpcomingObligationItem[];
  transactions: LedgerTransactionDTO[];
  accounts: PaymentAccountDTO[];
  categories: string[];
  emptyMessage?: string;
}) {
  const router = useRouter();
  const [paying, setPaying] = useState<UpcomingObligationItem | null>(null);
  const [skipping, setSkipping] = useState<UpcomingObligationItem | null>(null);
  const [mode, setMode] = useState<"link" | "create">("link");
  const [transactionId, setTransactionId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [category, setCategory] = useState("Miscellaneous");
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
  const categoryOptions = categories.map((item) => ({ value: item, label: item }));
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
      <div className="border border-dashed border-input px-5 py-8 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <>
      <div className="border border-border bg-card divide-y divide-border">
        {obligations.map((item) => {
          const days = daysUntilDue(item.dueDate);
          const overdue = days < 0;
          const dueSoon = !overdue && days <= 7;

          return (
            <div
              key={`${item.type}-${item.sourceId}-${item.dueDate}`}
              className="flex flex-wrap items-center gap-4 px-5 py-4"
            >
              <div className="min-w-0 flex-1">
                <p className="np-caps text-muted-foreground">{typeLabel(item.type)}</p>
                <p className="mt-1 truncate font-bold">{item.name}</p>
              </div>
              <Badge variant={overdue ? "destructive" : dueSoon ? "warning" : "outline"}>
                {formatDate(item.dueDate)}
              </Badge>
              <p className="shrink-0 font-extrabold tabular-nums">
                {formatINR(item.amount, { compact: true })}
              </p>
              <div className="flex shrink-0 gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSkipping(item)}
                >
                  <SkipForward className="size-4" />
                  Skip
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => openPay(item)}
                >
                  <CircleCheck className="size-4" />
                  Paid
                </Button>
              </div>
            </div>
          );
        })}
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
            <Button variant="ghost" onClick={() => setSkipping(null)} disabled={pending}>
              Keep pending
            </Button>
            <Button variant="default" onClick={handleSkip} disabled={pending}>
              {pending ? "Skipping…" : "Skip this payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={Boolean(paying)} onOpenChange={(open) => !open && setPaying(null)}>
        <SheetContent
          side="bottom"
          className="flex max-h-[92dvh] flex-col gap-0 p-0 sm:inset-y-0 sm:right-0 sm:left-auto sm:h-full sm:max-h-none sm:w-[30rem] sm:border-t-0 sm:border-l"
        >
          <div className="mx-auto mt-3 h-1 w-10 shrink-0 bg-border sm:hidden" />
          <SheetHeader className="border-b border-border px-5 py-4">
            <SheetTitle>Mark as paid</SheetTitle>
            <SheetDescription>
              {paying
                ? `${paying.name} · ${formatINR(paying.amount)} due ${formatDate(paying.dueDate)}`
                : "Link or create a ledger entry."}
            </SheetDescription>
          </SheetHeader>

          {paying ? (
            <form onSubmit={handlePay} className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
                <Tabs value={mode} onValueChange={(value) => setMode(value as "link" | "create")}>
                  <TabsList className="w-full">
                    <TabsTrigger value="link">
                      <Link2 className="size-4" /> Link ledger
                    </TabsTrigger>
                    <TabsTrigger value="create">
                      <Plus className="size-4" /> Create entry
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="link" className="space-y-2 pt-1">
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
                  </TabsContent>

                  <TabsContent value="create" className="space-y-5 pt-1">
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
                  </TabsContent>
                </Tabs>

                <div className="space-y-2">
                  <Label htmlFor="obligation-category">Ledger category</Label>
                  <LabeledSelect
                    id="obligation-category"
                    value={category}
                    onValueChange={setCategory}
                    options={categoryOptions}
                  />
                </div>

                <div className="border border-success/25 bg-success/5 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
                  Marking paid removes this obligation from the dashboard. Investment totals or insurance premium history update automatically.
                </div>
              </div>

              <SheetFooter className="border-t border-border bg-muted px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
                <Button type="submit" variant="default" size="lg" className="w-full" disabled={pending}>
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
