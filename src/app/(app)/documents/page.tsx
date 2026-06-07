import { getSession } from "@/lib/auth/session";
import { getDocuments, getPaymentAccounts } from "@/lib/db/queries/ledger";
import { DocumentsClient } from "@/components/ledger/documents-client";
import { PageShell, PageHeader } from "@/components/layout/page-chrome";

export default async function DocumentsPage() {
  const session = await getSession();
  if (!session) return null;

  const [documents, accounts] = await Promise.all([
    getDocuments(session.userId),
    getPaymentAccounts(session.userId),
  ]);

  return (
    <PageShell>
      <PageHeader
        title="Documents"
        description="Upload salary slips and bills — enter details manually, then apply to your income or accounts."
      />

      <DocumentsClient documents={documents} accounts={accounts} />
    </PageShell>
  );
}
