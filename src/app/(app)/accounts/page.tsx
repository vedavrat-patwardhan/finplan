import { getSession } from "@/lib/auth/session";
import { getPaymentAccounts, getCardMonthlySpend } from "@/lib/db/queries/ledger";
import { AccountsClient } from "@/components/ledger/accounts-client";
import { AccountFormSheet } from "@/components/ledger/account-form-sheet";
import { PageShell, PageHeader } from "@/components/layout/page-chrome";

export default async function AccountsPage() {
  const session = await getSession();
  if (!session) return null;

  const [accounts, cardSpend] = await Promise.all([
    getPaymentAccounts(session.userId),
    getCardMonthlySpend(session.userId),
  ]);

  return (
    <PageShell>
      <PageHeader
        title="Accounts"
        description="Cards, bank accounts, and UPI wallets — reveal and copy details only when you need them."
      >
        {accounts.length > 0 ? <AccountFormSheet /> : null}
      </PageHeader>

      <AccountsClient accounts={accounts} cardSpend={cardSpend} />
    </PageShell>
  );
}
