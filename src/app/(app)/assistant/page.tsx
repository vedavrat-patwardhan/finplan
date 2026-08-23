import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getIntegrationSettings } from "@/lib/db/queries/integrations";
import { getMonthlySnapshot } from "@/lib/db/queries/finance";
import { getPaymentAccounts } from "@/lib/db/queries/ledger";
import { sumAvailableBalance } from "@/lib/finance/ledger";
import { FinanceAssistant } from "@/components/assistant/finance-assistant";
import { PageHeader, PageShell } from "@/components/layout/page-chrome";

export default async function AssistantPage() {
  const session = await getSession();
  if (!session) return null;
  if (session.username.trim().toLowerCase() !== "vedavrat") redirect("/dashboard");

  const [settings, snapshot, accounts] = await Promise.all([
    getIntegrationSettings(session.userId),
    getMonthlySnapshot(session.userId),
    getPaymentAccounts(session.userId),
  ]);

  return (
    <PageShell>
      <PageHeader title="Financial assistant" description="Ask whether a purchase is affordable, plan a future expense, or test its impact on goals and investments." />
      <FinanceAssistant
        settings={settings}
        summary={{
          liquidBalance: sumAvailableBalance(accounts),
          monthlySurplus: snapshot.netSurplus,
          monthlyInvestments: snapshot.investments,
        }}
      />
    </PageShell>
  );
}
