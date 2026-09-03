import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getIntegrationSettings } from "@/lib/db/queries/integrations";
import { getMonthlySnapshot } from "@/lib/db/queries/finance";
import { getPaymentAccounts } from "@/lib/db/queries/ledger";
import { listConversations } from "@/lib/db/queries/assistant";
import { sumAvailableBalance } from "@/lib/finance/ledger";
import { FinanceAssistant } from "@/components/assistant/finance-assistant";
import { PageHeader, PageShell } from "@/components/layout/page-chrome";

export default async function AssistantPage() {
  const session = await getSession();
  if (!session) return null;
  if (session.username.trim().toLowerCase() !== "vedavrat") redirect("/dashboard");

  const [settings, snapshot, accounts, conversations] = await Promise.all([
    getIntegrationSettings(session.userId),
    getMonthlySnapshot(session.userId),
    getPaymentAccounts(session.userId),
    listConversations(session.userId),
  ]);

  return (
    <PageShell>
      <PageHeader
        title="Financial assistant"
        description="Ask about spending by month, category or merchant, budgets, dues, or whether a plan is affordable."
      />
      <FinanceAssistant
        settings={settings}
        summary={{
          liquidBalance: sumAvailableBalance(accounts),
          monthlySurplus: snapshot.netSurplus,
          monthlyInvestments: snapshot.investments,
        }}
        initialConversations={conversations}
      />
    </PageShell>
  );
}
