import { getSession } from "@/lib/auth/session";
import { getPaymentAccounts } from "@/lib/db/queries/ledger";
import { AccountsClient } from "@/components/ledger/accounts-client";
import { AccountFormSheet } from "@/components/ledger/account-form-sheet";

export default async function AccountsPage() {
  const session = await getSession();
  if (!session) return null;

  const accounts = await getPaymentAccounts(session.userId);

  return (
    <div className="page-container space-y-6 pb-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Accounts</h1>
          <p className="mt-1 max-w-lg text-muted-foreground">
            Your cards, bank accounts, and wallets in one place — copy details when you need them,
            track balances as you spend.
          </p>
        </div>
        {accounts.length > 0 ? <AccountFormSheet /> : null}
      </div>

      <AccountsClient accounts={accounts} />
    </div>
  );
}
