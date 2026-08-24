import { Suspense } from "react";
import { getSession } from "@/lib/auth/session";
import {
  getCategoryRules,
  getTransactions,
  getLedgerSummary,
} from "@/lib/db/queries/ledger";
import { formatINR } from "@/lib/format";
import { TransactionList } from "@/components/ledger/transaction-list";
import { QuickAddButton } from "@/components/ledger/quick-add-button";
import { MonthNav } from "@/components/ledger/month-nav";
import { CategoryRulesSheet } from "@/components/ledger/category-rules-sheet";
import { PageShell, PageHeader, InsightPanel } from "@/components/layout/page-chrome";

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ account?: string; month?: string; from?: string; to?: string }>;
}) {
  const session = await getSession();
  if (!session) return null;

  const params = await searchParams;
  const now = new Date();
  const month =
    params.month ??
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const validDate = /^\d{4}-\d{2}-\d{2}$/;
  const dateFrom = params.from && validDate.test(params.from) ? params.from : undefined;
  const dateTo = params.to && validDate.test(params.to) ? params.to : undefined;
  const hasValidRange = Boolean(dateFrom && dateTo && dateFrom <= dateTo);
  const period = hasValidRange
    ? { dateFrom, dateTo }
    : { month };

  const [transactions, summary, categoryRules] = await Promise.all([
    getTransactions(session.userId, {
      ...period,
      accountId: params.account,
      limit: hasValidRange ? 500 : 100,
    }),
    getLedgerSummary(session.userId, period),
    getCategoryRules(session.userId),
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
        <MonthNav
          month={month}
          accountId={params.account}
          dateFrom={hasValidRange ? dateFrom : undefined}
          dateTo={hasValidRange ? dateTo : undefined}
        />
      </Suspense>

      <div className="flex justify-end">
        <CategoryRulesSheet rules={categoryRules} />
      </div>

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
