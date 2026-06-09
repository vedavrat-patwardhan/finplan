import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import {
  getDashboardData,
  getGoalsWithFeasibility,
  getUpcomingObligationsForUser,
  getPortfolioChartData,
  getInvestments,
} from "@/lib/db/queries/finance";
import { getLedgerSummary } from "@/lib/db/queries/ledger";
import { formatINR, formatPercent, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { GoalTimeline } from "@/components/finance/goal-timeline";
import { PortfolioChartsSection } from "@/components/finance/portfolio-charts-section";
import { FuturePredictionPanel } from "@/components/finance/future-prediction-panel";
import { chartColorAt } from "@/lib/finance/chart-colors";
import { generateFutureProjection } from "@/lib/finance/engine";
import {
  PageShell,
  PageHeader,
  PageSection,
  InsightPanel,
  MetaStat,
} from "@/components/layout/page-chrome";

const obligationTypeStyles: Record<string, string> = {
  investment: "border-l-chart-1 bg-chart-1/5",
  insurance: "border-l-chart-2 bg-chart-2/5",
  expense: "border-l-chart-3 bg-chart-3/5",
  income: "border-l-chart-6 bg-chart-6/5",
};

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) return null;

  const [{ profile, snapshot }, chartData, goals, obligations, ledger, investments] =
    await Promise.all([
      getDashboardData(session.userId),
      getPortfolioChartData(session.userId),
      getGoalsWithFeasibility(session.userId),
      getUpcomingObligationsForUser(session.userId),
      getLedgerSummary(session.userId),
      getInvestments(session.userId),
    ]);

  const portfolioValue = investments.reduce(
    (sum, i) => sum + (i.metrics.fundValue ?? i.metrics.totalInvested),
    0
  );
  const totalInvested = investments.reduce((sum, i) => sum + i.metrics.totalInvested, 0);
  const portfolioReturnPct =
    totalInvested > 0 && portfolioValue > totalInvested
      ? ((portfolioValue - totalInvested) / totalInvested) * 100
      : investments.length > 0
        ? investments.reduce((sum, i) => sum + i.expectedReturnPct, 0) / investments.length
        : 12;

  const futureProjection = generateFutureProjection({
    monthlySurplus: snapshot.netSurplus,
    monthlyInvestments: snapshot.investments,
    currentPortfolioValue: portfolioValue,
    portfolioReturnPct,
  });

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
              tone={snapshot.netSurplus >= 0 ? "positive" : "default"}
            />
            <MetaStat
              label="Savings rate"
              value={formatPercent(snapshot.savingsRate)}
              tone="info"
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
        <div className="rounded-xl border border-border border-l-[3px] border-l-chart-4 bg-card px-5 py-4">
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
                  className={cn(
                    "h-full rounded-full transition-all",
                    budgetUsedPct > 90 ? "bg-chart-3" : budgetUsedPct > 70 ? "bg-chart-2" : "bg-chart-1"
                  )}
                  style={{ width: `${budgetUsedPct}%` }}
                />
              </div>
            </>
          ) : null}
          {ledger.byCategory.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {ledger.byCategory.slice(0, 5).map((item, i) => (
                <span
                  key={item.category}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border/60 px-3 py-1 text-xs"
                  style={{ backgroundColor: `${chartColorAt(i)}18` }}
                >
                  <span
                    className="size-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: chartColorAt(i) }}
                    aria-hidden
                  />
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

      <PageSection title="Future outlook" description="Where your plan could be in 12 months">
        <FuturePredictionPanel
          projection={futureProjection}
          monthlySurplus={snapshot.netSurplus}
        />
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
        <GoalTimeline
          goals={activeGoals.length > 0 ? activeGoals : goals}
          monthlySurplus={snapshot.netSurplus}
          defaultMonthlyExpenses={snapshot.fixedExpenses}
          compact
        />
      </PageSection>

      <PageSection
        title="Upcoming obligations"
        description="SIP payments, renewals, and other items due in the next 31–90 days"
      >
        {obligations.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing due soon — monthly SIPs and half-yearly investments appear here before
            their next payment date.
          </p>
        ) : (
          <div className="list-stack">
            {obligations.map((item, i) => (
              <div
                key={`${item.name}-${i}`}
                className={cn(
                  "flex items-center justify-between rounded-xl border border-border border-l-[3px] px-4 py-3",
                  obligationTypeStyles[item.type] ?? "border-l-chart-5 bg-chart-5/5"
                )}
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
