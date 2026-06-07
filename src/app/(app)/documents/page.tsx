import { getSession } from "@/lib/auth/session";
import { getDocuments, getPaymentAccounts } from "@/lib/db/queries/ledger";
import { DocumentsClient } from "@/components/ledger/documents-client";

export default async function DocumentsPage() {
  const session = await getSession();
  if (!session) return null;

  const [documents, accounts] = await Promise.all([
    getDocuments(session.userId),
    getPaymentAccounts(session.userId),
  ]);

  return (
    <div className="page-container space-y-6 pb-8">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Documents</h1>
        <p className="mt-1 text-muted-foreground">
          Upload salary slips, bills, and receipts — enter details manually for now
        </p>
      </div>

      <DocumentsClient documents={documents} accounts={accounts} />
    </div>
  );
}
