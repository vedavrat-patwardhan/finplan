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
