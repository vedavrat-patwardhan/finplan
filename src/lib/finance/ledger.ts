import type { PaymentAccountType, TransactionType } from "@/lib/finance/constants";

/** Signed delta applied to PaymentAccount.currentBalance */
export function transactionBalanceDelta(
  accountType: PaymentAccountType,
  txType: TransactionType,
  amount: number,
  mode: "apply" | "revert" = "apply"
): number {
  const sign = mode === "apply" ? 1 : -1;

  if (accountType === "credit_card") {
    // Positive balance = amount owed on the card
    return txType === "debit" ? sign * amount : sign * -amount;
  }

  // Bank, cash, wallet: positive balance = funds available
  return txType === "debit" ? sign * -amount : sign * amount;
}

/**
 * Total liquid funds on hand — sums balances of bank, cash, wallet and debit
 * accounts. Credit cards are excluded: their balance is money owed, not money
 * available.
 */
export function sumAvailableBalance<
  T extends { type: PaymentAccountType; currentBalance: number }
>(accounts: T[]): number {
  return accounts.reduce(
    (sum, account) =>
      account.type === "credit_card" ? sum : sum + account.currentBalance,
    0
  );
}

export function formatAccountLabel(
  name: string,
  institution?: string,
  lastFour?: string
): string {
  const parts = [name];
  if (institution) parts.push(institution);
  if (lastFour) parts.push(`•••• ${lastFour}`);
  return parts.join(" · ");
}

type AccountSortable = {
  isFavorite?: boolean;
  isDefault?: boolean;
  name: string;
};

/** Favourites first, then default account, then alphabetical. */
export function sortPaymentAccounts<T extends AccountSortable>(accounts: T[]): T[] {
  return [...accounts].sort((a, b) => {
    const favoriteDelta = Number(b.isFavorite) - Number(a.isFavorite);
    if (favoriteDelta !== 0) return favoriteDelta;

    const defaultDelta = Number(b.isDefault) - Number(a.isDefault);
    if (defaultDelta !== 0) return defaultDelta;

    return a.name.localeCompare(b.name, "en-IN");
  });
}

export function pickPreferredAccountId<T extends AccountSortable & { id: string }>(
  accounts: T[],
  storedId?: string | null
): string {
  const sorted = sortPaymentAccounts(accounts);
  if (sorted.length === 0) return "";

  if (storedId) {
    const match = sorted.find((account) => account.id === storedId);
    if (match) return match.id;
  }

  return (
    sorted.find((account) => account.isDefault)?.id ??
    sorted.find((account) => account.isFavorite)?.id ??
    sorted[0].id
  );
}
