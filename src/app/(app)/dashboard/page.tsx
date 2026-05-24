import { getSession } from "@/lib/auth/session";
import {
  getDashboardData,
  getGoalsWithFeasibility,
  getUpcomingObligationsForUser,
  getPortfolioChartData,
} from "@/lib/db/queries/finance";
import { formatINR, formatPercent, formatDate } from "@/lib/format";
import { GoalTimeline } from "@/components/finance/goal-timeline";
import { PortfolioChartsSection } from "@/components/finance/portfolio-charts-section";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) return null;

  const [{ profile, snapshot }, chartData, goals, obligations] = await Promise.all([
    getDashboardData(session.userId),
    getPortfolioChartData(session.userId),
    getGoalsWithFeasibility(session.userId),
    getUpcomingObligationsForUser(session.userId),
  ]);

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
