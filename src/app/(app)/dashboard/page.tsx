import Link from "next/link";
import { Check } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import {
  getDashboardData,
  getPortfolioChartData,
  getInvestments,
  getExpenses,
} from "@/lib/db/queries/finance";
import {
  getLedgerSummary,
  getCustomLedgerCategories,
  getPaymentAccounts,
  getTransactions,
} from "@/lib/db/queries/ledger";
import { sumAvailableBalance } from "@/lib/finance/ledger";
import { formatINR, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GoalTimeline } from "@/components/finance/goal-timeline";
import { CashBufferPanel } from "@/components/finance/cash-buffer-panel";
import { toMonthlyEquivalent } from "@/lib/finance/engine";
import { PortfolioChartsSection } from "@/components/finance/portfolio-charts-section";
import { chartCssVar } from "@/lib/finance/chart-colors";
import {
  PageShell,
  PageHeader,
  PageSection,
  InsightPanel,
} from "@/components/layout/page-chrome";
import { GetStartedBanner } from "@/components/finance/get-started-banner";
import { ObligationList } from "@/components/finance/upcoming-obligations";
import { LEDGER_CATEGORIES } from "@/lib/finance/constants";

const summaryCardTones = {
  default: "border-border bg-card",
  positive: "border-border bg-card",
  info: "border-border bg-card",
  hero: "border-transparent bg-brand np-edge-brand",
} as const;

function SummaryBreakdownCard({
  label,
  value,
  items,
  tone = "default",
  note,
}: {
  label: string;
  value: string;
  items: Array<{ label: string; value: string; valueTone?: "positive" | "negative" }>;
  tone?: keyof typeof summaryCardTones;
  note?: string;
}) {
  const isHero = tone === "hero";
  return (
    <section className={cn("np-plunk min-w-0 border px-5 py-4", summaryCardTones[tone])}>
      <p className={cn("np-caps", isHero ? "text-brand-foreground/70" : "text-muted-foreground")}>
        {label}
      </p>
      <p
        className={cn(
          "mt-2 text-2xl font-extrabold tabular-nums tracking-tight",
          tone === "positive" && "text-success-text",
          tone === "info" && "text-info-text",
          isHero && "text-brand-foreground"
        )}
      >
        {value}
      </p>
      <div
        className={cn(
          "mt-3 divide-y border-t text-xs",
          isHero ? "divide-brand-foreground/15 border-brand-foreground/15" : "divide-border border-border"
        )}
      >
        {items.map((item) => (
          <div key={item.label} className="flex items-start justify-between gap-3 py-2">
            <span
              className={cn("min-w-0 truncate", isHero ? "text-brand-foreground/70" : "text-muted-foreground")}
              title={item.label}
            >
              {item.label}
            </span>
            <span
              className={cn(
                "shrink-0 font-medium tabular-nums",
                isHero
                  ? item.valueTone === "negative"
                    ? "text-destructive"
                    : "text-brand-foreground"
                  : item.valueTone === "positive"
                    ? "text-success-text"
                    : item.valueTone === "negative"
                      ? "text-destructive"
                      : "text-foreground"
              )}
            >
              {item.value}
            </span>
          </div>
        ))}
      </div>
      {note ? (
        <p
          className={cn(
            "mt-1 text-[11px] leading-relaxed",
            isHero ? "text-brand-foreground/70" : "text-muted-foreground"
          )}
        >
          {note}
        </p>
      ) : null}
    </section>
  );
}

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) return null;

  const [dashboard, chartData, ledger, investments, expenses, accounts, recentTransactions, customCategories] =
    await Promise.all([
      getDashboardData(session.userId),
      getPortfolioChartData(session.userId),
      getLedgerSummary(session.userId),
      getInvestments(session.userId),
      getExpenses(session.userId),
      getPaymentAccounts(session.userId),
      getTransactions(session.userId, { limit: 250 }),
      getCustomLedgerCategories(session.userId),
    ]);
  const { profile, snapshot, goals, obligations, pastDueObligations } = dashboard;
  const ledgerCategories = [...LEDGER_CATEGORIES, ...customCategories.map((item) => item.name)];

  const availableBalance = sumAvailableBalance(accounts);
  const liquidAccounts = accounts.filter(
    (account) => account.type !== "credit_card" && account.type !== "debit_card"
  );
  const monthlyEssential = expenses
    .filter((e) => e.isEssential)
    .reduce((sum, e) => sum + toMonthlyEquivalent(e.amount, e.frequency), 0);

  const showGetStarted =
    expenses.length === 0 && investments.length === 0 && goals.length === 0;

  const budgetDelta = ledger.budgetMonthly - ledger.budgetDebits;
  const budgetUsedPct =
    ledger.budgetMonthly > 0
      ? Math.min(100, Math.round((ledger.budgetDebits / ledger.budgetMonthly) * 100))
      : 0;

  const activeGoals = goals.filter((g) => g.status !== "completed");
  const completedGoals = goals.filter((g) => g.status === "completed");

  return (
    <PageShell>
      <PageHeader
        title="Dashboard"
        description={
          profile?.householdEnabled && profile.spouseName
            ? `Household plan for you and ${profile.spouseName} — planned vs actual spending.`
            : profile?.name
              ? `${profile.name}, here's how your plan and actual spending compare.`
              : "Your monthly plan, actual spending, and goal progress in one place."
        }
        meta={
          <div className="grid w-full gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <SummaryBreakdownCard
              label="Available balance"
              value={formatINR(availableBalance, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
              tone="hero"
              items={liquidAccounts.map((account) => ({
                label: `${account.name}${account.lastFour ? ` · •••• ${account.lastFour}` : ""}`,
                value: formatINR(account.currentBalance, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }),
                valueTone: account.currentBalance >= 0 ? "positive" : "negative",
              }))}
              note={
                liquidAccounts.length === 0
                  ? "No bank, cash, or wallet accounts added yet."
                  : "Debit and credit cards are excluded because their money belongs to a linked bank account or credit line."
              }
            />
            <SummaryBreakdownCard
              label="Monthly surplus"
              value={formatINR(snapshot.netSurplus, { compact: profile?.useCompactNumbers })}
              tone={snapshot.netSurplus >= 0 ? "positive" : "default"}
              items={[
                {
                  label: "Income",
                  value: `+${formatINR(snapshot.grossIncome)}`,
                  valueTone: "positive",
                },
                { label: "Expenses", value: `−${formatINR(snapshot.fixedExpenses)}` },
                { label: "Investments", value: `−${formatINR(snapshot.investments)}` },
                { label: "Insurance", value: `−${formatINR(snapshot.insurance)}` },
              ]}
            />
            <SummaryBreakdownCard
              label="Savings rate"
              value={formatPercent(snapshot.savingsRate)}
              tone="info"
              items={[
                { label: "Monthly investments", value: formatINR(snapshot.investments) },
                { label: "Monthly income", value: formatINR(snapshot.grossIncome) },
              ]}
              note="Monthly investments ÷ monthly income. Uninvested surplus is not counted."
            />
          </div>
        }
      />

      {showGetStarted ? <GetStartedBanner /> : null}

      <PageSection
        title="Cash buffer"
        description="The ideal amount to keep on hand — your monthly essentials, plus an optional emergency fund"
      >
        <CashBufferPanel
          availableBalance={availableBalance}
          monthlyEssential={monthlyEssential}
          compact={profile?.useCompactNumbers}
        />
      </PageSection>

      <InsightPanel>
        <p>
          <span className="text-muted-foreground">Planned monthly cashflow: </span>
          <span className="font-medium text-foreground tabular-nums">
            {formatINR(snapshot.grossIncome, { compact: true })}
          </span>{" "}
          income ·{" "}
          <span className="tabular-nums">
            {formatINR(snapshot.fixedExpenses, { compact: true })}
          </span>{" "}
          expense budgets ·{" "}
          <span className="tabular-nums">
            {formatINR(snapshot.investments + snapshot.insurance, { compact: true })}
          </span>{" "}
          committed. Edit these in{" "}
          <Button variant="link" render={<Link href="/expenses" />}>
            Expenses
          </Button>{" "}
          and{" "}
          <Button variant="link" render={<Link href="/investments" />}>
            Investments
          </Button>
          .
        </p>
      </InsightPanel>

      <PageSection
        title="Ledger spending"
        description="Actual amounts from transactions you logged — not your editable expense budgets"
      >
        <div className="border border-border border-l-[3px] border-l-brand bg-card px-5 py-4">
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
                <span className="tabular-nums text-success-text">
                  {formatINR(ledger.totalCredits, { compact: true })}
                </span>{" "}
                received
              </>
            ) : null}
          </p>
          {ledger.budgetMonthly > 0 && ledger.budgetTransactionCount > 0 ? (
            <>
              <p className="mt-2 text-sm text-muted-foreground">
                Flexible budget spend{" "}
                <span className="font-medium tabular-nums text-foreground">
                  {formatINR(ledger.budgetDebits, { compact: profile?.useCompactNumbers })}
                </span>{" "}
                of{" "}
                <span className="font-medium tabular-nums text-foreground">
                  {formatINR(ledger.budgetMonthly, { compact: profile?.useCompactNumbers })}
                </span>
                <span className="text-xs">
                  {" "}(Shopping, Entertainment, Food & Subscriptions)
                </span>
                {budgetDelta >= 0 ? (
                  <span className="text-success-text">
                    {" "}
                    · {formatINR(budgetDelta, { compact: true })} under budget
                  </span>
                ) : (
                  <span className="text-destructive">
                    {" "}
                    · {formatINR(Math.abs(budgetDelta), { compact: true })} over budget
                  </span>
                )}
              </p>
              <div className="mt-4 h-2 bg-muted">
                <div
                  className={cn(
                    "h-full transition-all",
                    budgetUsedPct > 90
                      ? "bg-destructive"
                      : budgetUsedPct > 70
                        ? "bg-warning"
                        : "bg-success"
                  )}
                  style={{ width: `${budgetUsedPct}%` }}
                />
              </div>
            </>
          ) : ledger.budgetMonthly > 0 && ledger.budgetTransactionCount === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              You have flexible-spending budgets totalling{" "}
              <span className="font-medium tabular-nums text-foreground">
                {formatINR(ledger.budgetMonthly, { compact: true })}
              </span>
              /mo. Shopping, Entertainment, Food and Subscriptions count toward this budget.
            </p>
          ) : null}
          {ledger.byCategory.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {ledger.byCategory.slice(0, 5).map((item, i) => (
                <Badge key={item.category} variant="outline" className="gap-1.5">
                  <span
                    className="size-2 shrink-0"
                    style={{ backgroundColor: chartCssVar(i) }}
                    aria-hidden
                  />
                  {item.category}
                  <span className="font-bold tabular-nums">
                    {formatINR(item.amount, { compact: true })}
                  </span>
                </Badge>
              ))}
            </div>
          ) : null}
          <Button variant="link" render={<Link href="/transactions" />} className="mt-4">
            Open ledger →
          </Button>
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
              <Badge key={g.id} variant="success" className="gap-1">
                <Check className="size-3" />
                {g.title}
              </Badge>
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
        <ObligationList
          obligations={obligations.map((item) => ({
            ...item,
            dueDate: item.dueDate.toISOString(),
          }))}
          transactions={recentTransactions}
          accounts={accounts}
          categories={ledgerCategories}
        />
      </PageSection>

      <PageSection
        title="Past obligations"
        description="All overdue items remain here until you mark them paid or skipped"
      >
        <ObligationList
          obligations={pastDueObligations.map((item) => ({
            ...item,
            dueDate: item.dueDate.toISOString(),
          }))}
          transactions={recentTransactions}
          accounts={accounts}
          categories={ledgerCategories}
          emptyMessage="No unmarked past obligations."
        />
      </PageSection>
    </PageShell>
  );
}
