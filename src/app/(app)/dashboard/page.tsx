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
import {
  PageShell,
  PageHeader,
  PageSection,
  InsightPanel,
  MetaStat,
} from "@/components/layout/page-chrome";

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
    <PageShell>
      <PageHeader
        title="Dashboard"
        description={
          profile?.name
            ? `${profile.name}, here's how your plan and actual spending compare.`
            : "Your monthly plan, actual spending, and goal progress in one place."
        }
        meta={
          <>
            <MetaStat
              label="Monthly surplus"
              value={formatINR(snapshot.netSurplus, { compact: profile?.useCompactNumbers })}
            />
            <MetaStat
              label="Savings rate"
              value={formatPercent(snapshot.savingsRate)}
            />
          </>
        }
      />

      <InsightPanel>
        <p>
          <span className="font-medium text-foreground tabular-nums">
            {formatINR(snapshot.grossIncome, { compact: true })}
          </span>{" "}
          in-hand income ·{" "}
          <span className="tabular-nums">
            {formatINR(snapshot.totalOutflow, { compact: true })}
          </span>{" "}
          outflow ·{" "}
          <span className="tabular-nums">
            {formatINR(snapshot.investments, { compact: true })}
          </span>{" "}
          invested
        </p>
      </InsightPanel>

      <PageSection
        title="Actual vs planned"
        description="What you logged in the ledger compared to expense budgets"
      >
        <div className="rounded-xl border border-border bg-card px-5 py-4">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground tabular-nums">
              {formatINR(ledger.totalDebits, { compact: profile?.useCompactNumbers })}
            </span>{" "}
            spent this month
            {ledger.transactionCount > 0
              ? ` across ${ledger.transactionCount} transaction${ledger.transactionCount === 1 ? "" : "s"}`
              : " — no transactions logged yet"}
            {ledger.totalCredits > 0 ? (
              <>
                {" "}
                ·{" "}
                <span className="tabular-nums text-success">
                  {formatINR(ledger.totalCredits, { compact: true })}
                </span>{" "}
                received
              </>
            ) : null}
          </p>
          {ledger.budgetMonthly > 0 ? (
            <>
              <p className="mt-2 text-sm text-muted-foreground">
                Planned budget{" "}
                <span className="font-medium tabular-nums text-foreground">
                  {formatINR(ledger.budgetMonthly, { compact: profile?.useCompactNumbers })}
                </span>
                {budgetDelta >= 0 ? (
                  <span className="text-success">
                    {" "}
                    · {formatINR(budgetDelta, { compact: true })} under
                  </span>
                ) : (
                  <span className="text-destructive">
                    {" "}
                    · {formatINR(Math.abs(budgetDelta), { compact: true })} over
                  </span>
                )}
              </p>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${budgetUsedPct}%` }}
                />
              </div>
            </>
          ) : null}
          {ledger.byCategory.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
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
            className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
          >
            Open ledger →
          </Link>
        </div>
      </PageSection>

      <PortfolioChartsSection data={chartData} />

      <PageSection
        title="Goal timeline"
        description={
          completedGoals.length > 0
            ? `${completedGoals.length} achieved · ${activeGoals.length} active`
            : "Milestones you're working toward"
        }
      >
        {completedGoals.length > 0 ? (
          <div className="mb-4 flex flex-wrap gap-2">
            {completedGoals.map((g) => (
              <span
                key={g.id}
                className="inline-flex items-center rounded-full bg-success/15 px-3 py-1 text-sm text-success"
              >
                ✓ {g.title}
              </span>
            ))}
          </div>
        ) : null}
        <GoalTimeline goals={activeGoals.length > 0 ? activeGoals : goals} />
      </PageSection>

      <PageSection title="Upcoming obligations" description="Renewals and non-monthly items in the next 90 days">
        {obligations.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing due soon — add insurance renewals or yearly expenses to track them here.
          </p>
        ) : (
          <div className="list-stack">
            {obligations.map((item, i) => (
              <div
                key={`${item.name}-${i}`}
                className="flex items-center justify-between rounded-xl border border-border bg-muted/25 px-4 py-3"
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
          </div>
        )}
      </PageSection>
    </PageShell>
  );
}
