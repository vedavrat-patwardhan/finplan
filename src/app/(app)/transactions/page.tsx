import { Suspense } from "react";
import { getSession } from "@/lib/auth/session";
import { getTransactions, getLedgerSummary } from "@/lib/db/queries/ledger";
import { formatINR } from "@/lib/format";
import { TransactionList } from "@/components/ledger/transaction-list";
import { QuickAddButton } from "@/components/ledger/quick-add-button";
import { MonthNav } from "@/components/ledger/month-nav";
import { PageShell, PageHeader, InsightPanel } from "@/components/layout/page-chrome";

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
    <PageShell>
      <PageHeader
        title="Ledger"
        description="What you actually spent and received — day by day."
      >
        <QuickAddButton className="hidden md:inline-flex" />
      </PageHeader>

      <Suspense fallback={null}>
        <MonthNav month={month} accountId={params.account} />
      </Suspense>

      <InsightPanel>
        <p>
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
          {" · "}
          {summary.transactionCount} transaction{summary.transactionCount === 1 ? "" : "s"}
          {summary.budgetMonthly > 0 ? (
            <>
              {" "}
              · Budget {formatINR(summary.budgetMonthly, { compact: true })}
            </>
          ) : null}
        </p>
      </InsightPanel>

      <TransactionList transactions={transactions} />
    </PageShell>
  );
}
