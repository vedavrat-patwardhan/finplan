"use client";

import { useState } from "react";
import Link from "next/link";
import { formatINR } from "@/lib/format";
import { formatAccountLabel } from "@/lib/finance/ledger";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { deleteTransactionAction } from "@/actions/ledger";
import type { LedgerTransactionDTO } from "@/lib/db/queries/ledger";
import { toast } from "sonner";

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (sameDay(d, today)) return "Today";
  if (sameDay(d, yesterday)) return "Yesterday";
  return d.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function groupByDay(transactions: LedgerTransactionDTO[]) {
  const groups = new Map<string, LedgerTransactionDTO[]>();
  for (const t of transactions) {
    const key = new Date(t.date).toDateString();
    const list = groups.get(key) ?? [];
    list.push(t);
    groups.set(key, list);
  }
  return [...groups.entries()].map(([key, items]) => ({
    key,
    label: dayLabel(items[0].date),
    items,
  }));
}

function DeleteTxButton({ id, label }: { id: string; label: string }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleDelete() {
    setPending(true);
    const result = await deleteTransactionAction(id);
    setPending(false);
    if (result.success) {
      toast.success("Transaction deleted");
      setOpen(false);
    } else {
      toast.error(result.error ?? "Failed to delete");
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-muted-foreground hover:text-destructive"
        onClick={() => setOpen(true)}
      >
        Delete
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete transaction?</DialogTitle>
            <DialogDescription>
              Remove {label} and reverse the balance change on the linked account.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={pending}>
              {pending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function TransactionList({ transactions }: { transactions: LedgerTransactionDTO[] }) {
  const groups = groupByDay(transactions);

  if (transactions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/20 px-6 py-12 text-center">
        <p className="font-heading text-lg">No transactions yet</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Tap <span className="font-medium text-foreground">Add</span> in the bottom bar, or{" "}
          <Link href="/accounts" className="text-primary underline-offset-4 hover:underline">
            set up an account
          </Link>{" "}
          first.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <section key={group.key}>
          <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {group.label}
          </h2>
          <div className="space-y-2">
            {group.items.map((t) => {
              const title = t.merchant || t.description || t.category;
              const accountLabel = formatAccountLabel(
                t.accountName,
                t.accountInstitution,
                t.accountLastFour
              );
              return (
                <div
                  key={t.id}
                  className="flex items-start justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3.5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{title}</p>
                      <Badge variant="secondary" className="text-xs">
                        {t.category}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{accountLabel}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(t.date).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <p
                      className={`font-medium tabular-nums ${
                        t.type === "credit" ? "text-success" : "text-foreground"
                      }`}
                    >
                      {t.type === "credit" ? "+" : "−"}
                      {formatINR(t.amount)}
                    </p>
                    <DeleteTxButton id={t.id} label={title} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

export function AccountFilterLink({
  accountId,
  accountName,
}: {
  accountId: string;
  accountName: string;
}) {
  return (
    <Link
      href={`/transactions?account=${accountId}`}
      className="text-xs text-primary underline-offset-4 hover:underline"
    >
      View transactions for {accountName}
    </Link>
  );
}
