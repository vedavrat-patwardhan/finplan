import { getSession } from "@/lib/auth/session";
import {
  getInvestments,
  getMonthlySnapshot,
  getUserProfile,
} from "@/lib/db/queries/finance";
import { FuturePredictionPanel } from "@/components/finance/future-prediction-panel";
import { weightedExpectedReturn } from "@/lib/finance/engine";
import { calculatePortfolioReturns } from "@/lib/finance/investment-metrics";
import { PageShell, PageHeader } from "@/components/layout/page-chrome";

export default async function PortfolioOutlookPage() {
  const session = await getSession();
  if (!session) return null;

  const [investments, snapshot, profile] = await Promise.all([
    getInvestments(session.userId),
    getMonthlySnapshot(session.userId),
    getUserProfile(session.userId),
  ]);

  const portfolioValue = investments.reduce(
    (sum, item) => sum + (item.metrics.fundValue ?? item.metrics.totalInvested),
    0
  );

  const portfolioReturns = calculatePortfolioReturns(
    investments.map((item) => ({
      metrics: item.metrics,
      startDate: new Date(item.startDate),
    }))
  );

  const expectedReturnPct = weightedExpectedReturn(
    investments.map((item) => ({
      amount: item.amount,
      frequency: item.frequency,
      expectedReturnPct: item.expectedReturnPct,
    }))
  );

  const currentReturnPct =
    portfolioReturns.annualizedReturnPct ??
    (portfolioReturns.totalInvested > 0
      ? portfolioReturns.absoluteReturnPct
      : expectedReturnPct);

  return (
    <PageShell>
      <PageHeader
        title="Portfolio outlook"
        description="Future value breakdown — invested capital vs interest, using your live portfolio and SIP plan."
        backHref="/calculators"
        backLabel="All calculators"
      />
      <FuturePredictionPanel
        inputs={{
          currentPortfolioValue: portfolioValue,
          monthlyInvestments: snapshot.investments,
          expectedReturnPct,
          currentReturnPct,
          inflationRate: profile?.inflationRate ?? 6,
        }}
      />
    </PageShell>
  );
}
