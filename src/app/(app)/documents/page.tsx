import { getSession } from "@/lib/auth/session";
import {
  getCustomLedgerCategories,
  getDocuments,
  getPaymentAccounts,
  getSavedPasswords,
} from "@/lib/db/queries/ledger";
import { LEDGER_CATEGORIES } from "@/lib/finance/constants";
import { DocumentsClient } from "@/components/ledger/documents-client";
import { PageShell, PageHeader } from "@/components/layout/page-chrome";

export default async function DocumentsPage() {
  const session = await getSession();
  if (!session) return null;

  const [documents, accounts, savedPasswords, customCategories] = await Promise.all([
    getDocuments(session.userId),
    getPaymentAccounts(session.userId),
    getSavedPasswords(session.userId),
    getCustomLedgerCategories(session.userId),
  ]);
  const categories = [...LEDGER_CATEGORIES, ...customCategories.map((item) => item.name)];

  return (
    <PageShell>
      <PageHeader
        title="Documents"
        description="Upload salary slips and bills — enter details manually, then apply to your income or accounts."
      />

      <DocumentsClient
        documents={documents}
        accounts={accounts}
        savedPasswords={savedPasswords}
        categories={categories}
      />
    </PageShell>
  );
}
