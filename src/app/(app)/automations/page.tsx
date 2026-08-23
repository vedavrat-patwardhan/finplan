import { getSession } from "@/lib/auth/session";
import { getIntegrationSettings, getMessageIngestions } from "@/lib/db/queries/integrations";
import { getPaymentAccounts } from "@/lib/db/queries/ledger";
import { AutomationCenter } from "@/components/integrations/automation-center";
import { PageHeader, PageShell } from "@/components/layout/page-chrome";

export default async function AutomationsPage() {
  const session = await getSession();
  if (!session) return null;
  const [settings, ingestions, accounts] = await Promise.all([
    getIntegrationSettings(session.userId),
    getMessageIngestions(session.userId),
    getPaymentAccounts(session.userId),
  ]);
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "https://your-finplan-domain.example").replace(/\/$/, "");

  return (
    <PageShell>
      <PageHeader
        title="Automations"
        description="Turn bank and UPI messages into ledger entries without giving the PWA access to your whole inbox."
      />
      <AutomationCenter
        settings={settings}
        webhookUrl={`${baseUrl}/api/ingest/sms`}
        ingestions={ingestions}
        accounts={accounts}
      />
    </PageShell>
  );
}
