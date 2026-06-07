import { Suspense } from "react";
import { getSession } from "@/lib/auth/session";
import { getTransactions, getLedgerSummary } from "@/lib/db/queries/ledger";
import { formatINR } from "@/lib/format";
import { TransactionList } from "@/components/ledger/transaction-list";
import { QuickAddButton } from "@/components/ledger/quick-add-button";
import { MonthNav } from "@/components/ledger/month-nav";

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ account?: string; month?: string }>;
}) {
  const session = await getSession();
  if (!session) return null;

  const params = await searchParams;
  const now = new Date();
  const month =
    params.month ??
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [transactions, summary] = await Promise.all([
    getTransactions(session.userId, {
      month,
      accountId: params.account,
      limit: 100,
    }),
    getLedgerSummary(session.userId, month),
  ]);

  return (
    <div className="page-container space-y-6 pb-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Ledger</h1>
          <p className="mt-1 text-muted-foreground">What you actually spent and received</p>
        </div>
        <QuickAddButton className="hidden md:inline-flex" />
      </div>

      <Suspense fallback={null}>
        <MonthNav month={month} accountId={params.account} />
      </Suspense>

      <section className="flex flex-wrap items-baseline justify-between gap-4 rounded-xl border border-border bg-muted/20 px-5 py-4">
        <div>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground tabular-nums">
              {formatINR(summary.totalDebits, { compact: true })}
            </span>{" "}
            spent
            {summary.totalCredits > 0 ? (
              <>
                {" "}
                ·{" "}
                <span className="tabular-nums text-success">
                  {formatINR(summary.totalCredits, { compact: true })}
                </span>{" "}
                received
              </>
            ) : null}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {summary.transactionCount} transaction{summary.transactionCount === 1 ? "" : "s"} this
            month
            {summary.budgetMonthly > 0 ? (
              <>
                {" "}
                · Budget {formatINR(summary.budgetMonthly, { compact: true })}
              </>
            ) : null}
          </p>
        </div>
      </section>

      <TransactionList transactions={transactions} />
    </div>
  );
}
