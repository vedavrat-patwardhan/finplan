import { getSession } from "@/lib/auth/session";
import { getInvestments } from "@/lib/db/queries/finance";
import { formatINR } from "@/lib/format";
import { sumMonthly } from "@/lib/finance/engine";
import { calculatePortfolioReturns } from "@/lib/finance/investment-metrics";
import { EmptyState } from "@/components/finance/empty-state";
import { InvestmentCard } from "@/components/finance/investment-card";
import { InvestmentFormSheet } from "@/components/finance/investment-form-sheet";
import { PortfolioReturnsPanel } from "@/components/finance/portfolio-returns-panel";
import { PageShell, PageHeader, MetaStat } from "@/components/layout/page-chrome";

export default async function InvestmentsPage() {
  const session = await getSession();
  if (!session) return null;

  const items = await getInvestments(session.userId);
  const monthlyTotal = sumMonthly(
    items.map((i) => ({
      amount: i.amount,
      frequency: i.frequency,
      type: i.type,
    }))
  );
  const totalInvested = items.reduce((sum, i) => sum + i.metrics.totalInvested, 0);
  const totalFundValue = items.reduce(
    (sum, i) => sum + (i.metrics.fundValue ?? i.metrics.totalInvested),
    0
  );

  const portfolioReturns = calculatePortfolioReturns(
    items.map((item) => ({
      metrics: item.metrics,
      startDate: new Date(item.startDate),
    }))
  );

  const returnsByInvestment = items.map((item) => ({
    name: item.name,
    invested: item.metrics.totalInvested,
    fundValue: item.metrics.fundValue ?? item.metrics.totalInvested,
    absoluteReturnPct: item.metrics.absoluteReturnPct ?? null,
  }));

  return (
    <PageShell>
      <PageHeader
        title="Investments"
        description="Monthly SIPs reduce surplus each month; quarterly and half-yearly payments appear in Upcoming obligations before they're due."
        meta={
          <>
            <MetaStat
              label="Monthly committed"
              value={`${formatINR(monthlyTotal, { compact: true })}/mo`}
            />
            <MetaStat
              label="Total invested"
              value={formatINR(totalInvested, { compact: true })}
            />
            <MetaStat
              label="Portfolio value"
              value={formatINR(totalFundValue, { compact: true })}
            />
          </>
        }
      >
        <InvestmentFormSheet />
      </PageHeader>

      {items.length === 0 ? (
        <EmptyState
          title="No investments tracked"
          description="Add your SIPs with a start date and either absolute return or current value to see fund performance."
        />
      ) : (
        <>
          <PortfolioReturnsPanel summary={portfolioReturns} byInvestment={returnsByInvestment} />
          <div className="list-stack">
            {items.map((item) => (
              <InvestmentCard key={item.id} item={item} />
            ))}
          </div>
        </>
      )}
    </PageShell>
  );
}
