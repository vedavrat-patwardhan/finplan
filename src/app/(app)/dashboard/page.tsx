import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import {
  getDashboardData,
  getGoalsWithFeasibility,
  getUpcomingObligationsForUser,
  getPortfolioChartData,
} from "@/lib/db/queries/finance";
import { getLedgerSummary } from "@/lib/db/queries/ledger";
import { formatINR, formatPercent, formatDate } from "@/lib/format";
import { GoalTimeline } from "@/components/finance/goal-timeline";
import { PortfolioChartsSection } from "@/components/finance/portfolio-charts-section";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) return null;

  const [{ profile, snapshot }, chartData, goals, obligations, ledger] =
    await Promise.all([
      getDashboardData(session.userId),
      getPortfolioChartData(session.userId),
      getGoalsWithFeasibility(session.userId),
      getUpcomingObligationsForUser(session.userId),
      getLedgerSummary(session.userId),
    ]);

  const budgetDelta = ledger.budgetMonthly - ledger.totalDebits;
  const budgetUsedPct =
    ledger.budgetMonthly > 0
      ? Math.min(100, Math.round((ledger.totalDebits / ledger.budgetMonthly) * 100))
      : 0;

  const activeGoals = goals.filter((g) => g.status !== "completed");
  const completedGoals = goals.filter((g) => g.status === "completed");

  return (
    <div className="page-container space-y-10 pb-8">
      <div>
        <h1 className="font-heading text-2xl font-semibold md:text-3xl">Dashboard</h1>
        <p className="mt-1 text-muted-foreground">
          Your financial snapshot and portfolio overview
        </p>
      </div>

      <section className="rounded-2xl border border-border bg-card p-6 md:p-8">
        <p className="text-sm text-muted-foreground">
          {profile?.name ? `${profile.name}, here's your monthly picture` : "Your monthly picture"}
        </p>
        <div className="mt-4 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-wider text-muted-foreground">
              Net monthly surplus
            </p>
            <p className="font-heading mt-1 text-4xl font-semibold tabular-nums md:text-5xl">
              {formatINR(snapshot.netSurplus, {
                compact: profile?.useCompactNumbers,
              })}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Savings rate {formatPercent(snapshot.savingsRate)} · In-hand income{" "}
              {formatINR(snapshot.grossIncome, { compact: true })}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm md:text-right">
            <div>
              <p className="text-muted-foreground">Outflow</p>
              <p className="font-medium tabular-nums">
                {formatINR(snapshot.totalOutflow, { compact: true })}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Investments</p>
              <p className="font-medium tabular-nums">
                {formatINR(snapshot.investments, { compact: true })}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6 md:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              This month (actual)
            </p>
            <p className="font-heading mt-2 text-3xl font-semibold tabular-nums">
              {formatINR(ledger.totalDebits, { compact: profile?.useCompactNumbers })}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {ledger.transactionCount === 0
                ? "No transactions logged yet"
                : `${ledger.transactionCount} transaction${ledger.transactionCount === 1 ? "" : "s"} logged`}
              {ledger.totalCredits > 0
                ? ` · ${formatINR(ledger.totalCredits, { compact: true })} received`
                : ""}
            </p>
          </div>
          <div className="text-sm sm:text-right">
            <p className="text-muted-foreground">Budget (planned)</p>
            <p className="font-medium tabular-nums">
              {formatINR(ledger.budgetMonthly, { compact: profile?.useCompactNumbers })}
            </p>
            {ledger.budgetMonthly > 0 ? (
              <p
                className={
                  budgetDelta >= 0
                    ? "mt-1 text-xs text-success"
                    : "mt-1 text-xs text-destructive"
                }
              >
                {budgetDelta >= 0
                  ? `${formatINR(budgetDelta, { compact: true })} under budget`
                  : `${formatINR(Math.abs(budgetDelta), { compact: true })} over budget`}
              </p>
            ) : null}
          </div>
        </div>

        {ledger.budgetMonthly > 0 ? (
          <div className="mt-5">
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${budgetUsedPct}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {budgetUsedPct}% of planned monthly spend
            </p>
          </div>
        ) : null}

        {ledger.byCategory.length > 0 ? (
          <div className="mt-5 flex flex-wrap gap-2">
            {ledger.byCategory.slice(0, 5).map((item) => (
              <span
                key={item.category}
                className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs"
              >
                <span className="text-muted-foreground">{item.category}</span>
                <span className="font-medium tabular-nums">
                  {formatINR(item.amount, { compact: true })}
                </span>
              </span>
            ))}
          </div>
        ) : null}

        <Link
          href="/transactions"
          className="mt-5 inline-block text-sm font-medium text-primary hover:underline"
        >
          View ledger →
        </Link>
      </section>

      <PortfolioChartsSection data={chartData} />

      <section>
        <div className="mb-6">
          <h2 className="font-heading text-xl font-semibold">Goal timeline</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Active milestones and achieved ones
          </p>
        </div>
        {completedGoals.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-2">
            {completedGoals.map((g) => (
              <span
                key={g.id}
                className="inline-flex items-center rounded-full bg-success/15 px-3 py-1 text-sm text-success"
              >
                ✓ {g.title}
              </span>
            ))}
          </div>
        )}
        <GoalTimeline goals={activeGoals.length > 0 ? activeGoals : goals} />
      </section>

      {obligations.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg">Upcoming obligations</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              No renewals or non-monthly items due in the next 90 days.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg">Upcoming obligations</CardTitle>
            <p className="text-sm text-muted-foreground">Next 90 days</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {obligations.map((item, i) => (
              <div
                key={`${item.name}-${i}`}
                className="flex items-center justify-between rounded-lg bg-muted/40 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium">{item.name}</p>
                  <p className="text-xs capitalize text-muted-foreground">
                    {item.type} · {formatDate(item.dueDate)}
                  </p>
                </div>
                <p className="text-sm font-medium tabular-nums">
                  {formatINR(item.amount, { compact: true })}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
