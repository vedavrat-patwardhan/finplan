import Link from "next/link";
import { ArrowUpRight, Landmark, Target, Users, Wallet } from "lucide-react";
import { DashboardModeToggle } from "@/components/family/dashboard-mode-toggle";
import { PageHeader, PageSection, PageShell } from "@/components/layout/page-chrome";
import { formatINR } from "@/lib/format";
import type { getFamilyDashboardData } from "@/lib/db/queries/family";

type FamilyData = NonNullable<Awaited<ReturnType<typeof getFamilyDashboardData>>>;
const money = (value: number) => formatINR(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function Metric({ label, amount, note, hero = false }: {
  label: string; amount: number; note: string; hero?: boolean;
}) {
  return (
    <div className={hero ? "np-plunk border border-brand bg-brand p-5 text-brand-foreground" : "np-plunk border border-border bg-card p-5"}>
      <p className={hero ? "np-caps text-brand-foreground/70" : "np-caps text-muted-foreground"}>{label}</p>
      <p className="mt-2 text-2xl font-extrabold tabular-nums tracking-tight">{money(amount)}</p>
      <p className={hero ? "mt-2 text-xs text-brand-foreground/70" : "mt-2 text-xs text-muted-foreground"}>{note}</p>
    </div>
  );
}

export function FamilyDashboard({ data }: { data: FamilyData }) {
  const liquidAccounts = data.accounts.filter((account) => account.type !== "credit_card" && account.type !== "debit_card");
  const creditCards = data.accounts.filter((account) => account.type === "credit_card");
  const activeGoals = data.goals.filter((goal) => goal.status !== "completed");
  const completedGoals = data.goals.filter((goal) => goal.status === "completed");
  return (
    <PageShell>
      <PageHeader
        title="Family dashboard"
        description={`${data.family.name} · ${data.members.length} member${data.members.length === 1 ? "" : "s"}. A shared view, with separate personal accounts.`}
        meta={<DashboardModeToggle mode="family" />}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Metric label="Money available together" amount={data.totals.availableBalance} note="Bank, cash, and wallet balances only" hero />
        <Metric label="Tracked investments" amount={data.totals.trackedInvestments} note="Current value when supplied; otherwise invested amount" />
        <Metric label="Active goal targets" amount={data.totals.goalTarget} note={`${money(data.totals.goalSaved)} saved across ${activeGoals.length} goals`} />
        <Metric label="Monthly family surplus" amount={data.totals.monthlySurplus} note="After expenses, investments, insurance, and goal savings" />
        <Metric label="Spent this month" amount={data.totals.spentThisMonth} note="Combined ledger debits; personal ledgers stay separate" />
        <Metric label="Card outstanding" amount={data.totals.creditCardOutstanding} note="Card utilisation, not the current bill due" />
      </div>

      <PageSection title="Monthly family plan" description="A combined view of each member’s personal plan">
        <div className="grid gap-3 border border-border bg-card p-5 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { label: "Income", amount: data.totals.monthlyIncome },
            { label: "Expense budgets", amount: data.totals.monthlyExpenses },
            { label: "Investments", amount: data.totals.monthlyInvestments },
            { label: "Insurance", amount: data.totals.monthlyInsurance },
            { label: "Goal savings", amount: data.totals.monthlyGoalSavings },
            { label: "Surplus after plans", amount: data.totals.monthlySurplus },
          ].map((item) => (
            <div key={item.label} className="border-l-[3px] border-l-brand bg-muted px-4 py-3">
              <p className="np-caps text-muted-foreground">{item.label}</p>
              <p className="mt-1 text-lg font-extrabold tabular-nums">{money(item.amount)}</p>
            </div>
          ))}
        </div>
      </PageSection>

      <PageSection title="Across members" description="Each person contributes their own balances and plan">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.members.map((member) => (
            <article key={member.userId} className="border border-border bg-card p-5">
              <div className="flex items-center gap-2">
                <Users className="size-4 text-brand-text" />
                <h3 className="font-extrabold">{member.name}</h3>
              </div>
              <p className="mt-4 text-2xl font-extrabold tabular-nums">{money(member.availableBalance)}</p>
              <p className="np-caps mt-1 text-muted-foreground">available</p>
              <dl className="mt-4 divide-y divide-border border-t border-border text-xs">
                <div className="flex justify-between gap-2 py-2"><dt className="text-muted-foreground">Monthly income</dt><dd className="tabular-nums">{money(member.monthlyIncome)}</dd></div>
                <div className="flex justify-between gap-2 py-2"><dt className="text-muted-foreground">Monthly commitments</dt><dd className="tabular-nums">{money(member.monthlyExpenses + member.monthlyInvestments + member.monthlyInsurance + member.monthlyGoalSavings)}</dd></div>
                <div className="flex justify-between gap-2 py-2"><dt className="text-muted-foreground">Monthly surplus</dt><dd className="font-bold tabular-nums">{money(member.monthlySurplus)}</dd></div>
                <div className="flex justify-between gap-2 py-2"><dt className="text-muted-foreground">Active goals</dt><dd>{member.goalCount}</dd></div>
              </dl>
            </article>
          ))}
        </div>
      </PageSection>

      <PageSection title="Money by account" description="A single view of each member’s bank, cash, and wallet balances">
        <div className="divide-y divide-border border border-border bg-card">
          {liquidAccounts.length === 0 ? <p className="p-5 text-sm text-muted-foreground">No liquid accounts added yet.</p> : liquidAccounts.map((account, index) => (
            <div key={`${account.ownerUserId}-${account.name}-${index}`} className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
              <div className="flex min-w-0 items-center gap-3">
                <Landmark className="size-4 shrink-0 text-brand-text" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{account.name}{account.lastFour ? ` · •••• ${account.lastFour}` : ""}</p>
                  <p className="np-caps mt-1 text-muted-foreground">{account.owner}</p>
                </div>
              </div>
              <span className="shrink-0 text-sm font-extrabold tabular-nums">{money(account.currentBalance)}</span>
            </div>
          ))}
        </div>
      </PageSection>

      <PageSection title="Cards & statement bills" description="Full card utilisation can include EMI principal; only the bank’s statement amount is due now">
        <div className="divide-y divide-border border border-border bg-card">
          {creditCards.length === 0 ? <p className="p-5 text-sm text-muted-foreground">No credit cards added yet.</p> : creditCards.map((card, index) => (
            <div key={`${card.ownerUserId}-${card.name}-${index}`} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{card.name}{card.lastFour ? ` · •••• ${card.lastFour}` : ""}</p>
                <p className="np-caps mt-1 text-muted-foreground">{card.owner}</p>
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs sm:text-right">
                <p className="tabular-nums"><span className="text-muted-foreground">Outstanding </span><strong>{money(card.currentBalance)}</strong></p>
                <p className="tabular-nums"><span className="text-muted-foreground">Statement due </span><strong>{card.billTotalDue > 0 ? money(card.billTotalDue) : "Not recorded"}</strong></p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Recorded statement bills: {money(data.totals.creditCardBillDue)}. This is separate from {money(data.totals.creditCardOutstanding)} outstanding utilisation.</p>
      </PageSection>

      <PageSection title="Goals together" description="Targets from every member, without transferring ownership">
        {completedGoals.length > 0 ? (
          <p className="mb-3 text-xs text-muted-foreground">
            {completedGoals.length} completed: {completedGoals.map((goal) => `${goal.title} (${goal.owner})`).join(" · ")}
          </p>
        ) : null}
        <div className="grid gap-3 md:grid-cols-2">
          {activeGoals.length === 0 ? <p className="text-sm text-muted-foreground">No active family goals yet.</p> : activeGoals.map((goal, index) => {
            const progress = goal.targetAmount > 0 ? Math.min(100, Math.round(goal.currentSaved / goal.targetAmount * 100)) : 0;
            return (
              <article key={`${goal.owner}-${goal.title}-${index}`} className="border border-border bg-card p-5">
                <div className="flex items-start gap-3">
                  <Target className="mt-0.5 size-4 shrink-0 text-brand-text" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-extrabold">{goal.title}</p>
                    <p className="np-caps mt-1 text-muted-foreground">{goal.owner}</p>
                  </div>
                  <span className="text-xs font-bold tabular-nums">{progress}%</span>
                </div>
                <div className="mt-4 h-2 bg-muted"><div className="h-full bg-brand" style={{ width: `${progress}%` }} /></div>
                <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs">
                  <span>{money(goal.currentSaved)} saved of {money(goal.targetAmount)}</span>
                  {goal.monthlyNeeded > 0 ? <span className="text-muted-foreground">{money(goal.monthlyNeeded)}/mo needed</span> : null}
                </div>
              </article>
            );
          })}
        </div>
      </PageSection>

      <PageSection title="Insurance together" description={`Policies across members · ${money(data.totals.insuranceCoverage)} combined stated coverage`}>
        <div className="divide-y divide-border border border-border bg-card">
          {data.insurance.length === 0 ? <p className="p-5 text-sm text-muted-foreground">No insurance policies added yet.</p> : data.insurance.map((policy, index) => (
            <div key={`${policy.owner}-${policy.name}-${index}`} className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{policy.name}</p>
                <p className="np-caps mt-1 text-muted-foreground">{policy.owner} · {policy.provider}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-extrabold tabular-nums">{money(policy.coverage)}</p>
                <p className="text-xs text-muted-foreground">{money(policy.monthlyPremium)}/mo premium</p>
              </div>
            </div>
          ))}
        </div>
      </PageSection>

      <PageSection title="Investments together" description="Contributions and tracked value across members">
        <div className="divide-y divide-border border border-border bg-card">
          {data.investments.length === 0 ? <p className="p-5 text-sm text-muted-foreground">No investments added yet.</p> : data.investments.map((investment, index) => (
            <div key={`${investment.owner}-${investment.name}-${index}`} className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{investment.name}</p>
                <p className="np-caps mt-1 text-muted-foreground">{investment.owner} · {money(investment.monthlyAmount)}/mo</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-extrabold tabular-nums">{money(investment.trackedValue)}</p>
                <p className="text-xs text-muted-foreground">{money(investment.totalInvested)} invested</p>
              </div>
            </div>
          ))}
        </div>
      </PageSection>

      <PageSection title="Upcoming family obligations" description="Read-only here; each member manages their own payments">
        <div className="divide-y divide-border border border-border bg-card">
          {data.obligations.length === 0 ? <p className="p-5 text-sm text-muted-foreground">Nothing due soon.</p> : data.obligations.slice(0, 15).map((obligation, index) => (
            <div key={`${obligation.owner}-${obligation.name}-${index}`} className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{obligation.name}</p>
                <p className="np-caps mt-1 text-muted-foreground">{obligation.owner} · {new Date(obligation.dueDate).toLocaleDateString("en-IN")}</p>
              </div>
              <span className="shrink-0 font-bold tabular-nums">{money(obligation.amount)}</span>
            </div>
          ))}
        </div>
      </PageSection>

      <div className="flex flex-wrap items-center gap-3 border border-border bg-muted px-5 py-4 text-xs text-muted-foreground">
        <Wallet className="size-4 shrink-0 text-brand-text" />
        Family mode is a shared summary. Edit your own accounts, goals, and transactions in personal mode.
        <Link href="/family" className="inline-flex items-center gap-1 font-bold text-brand-text">Manage family <ArrowUpRight className="size-3" /></Link>
      </div>
    </PageShell>
  );
}
