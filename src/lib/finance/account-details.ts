import type { PaymentAccountType } from "@/lib/finance/constants";

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

export function deriveLastFour(cardNumber?: string): string {
  const digits = digitsOnly(cardNumber ?? "");
  return digits.slice(-4);
}

export function formatCardNumberDisplay(cardNumber: string, masked = true): string {
  const digits = digitsOnly(cardNumber);
  if (!digits) return "";
  const groups = digits.match(/.{1,4}/g) ?? [];
  if (masked && digits.length > 4) {
    const last = digits.slice(-4);
    const hiddenCount = Math.max(0, digits.length - 4);
    const hiddenGroups = Math.ceil(hiddenCount / 4);
    const prefix = Array.from({ length: hiddenGroups }, () => "••••").join(" ");
    return `${prefix} ${last}`.trim();
  }
  return groups.join(" ");
}

export function formatAccountNumberDisplay(accountNumber: string, masked = true): string {
  const digits = digitsOnly(accountNumber);
  if (!digits) return "";
  if (masked && digits.length > 4) {
    return `•••• ${digits.slice(-4)}`;
  }
  return digits;
}

export function formatExpiry(month?: number, year?: number): string {
  if (!month || !year) return "";
  const yy = String(year).slice(-2);
  return `${String(month).padStart(2, "0")}/${yy}`;
}

export function isCardType(type: PaymentAccountType): boolean {
  return type === "credit_card" || type === "debit_card";
}

export function formatMaskedCardFromLastFour(lastFour: string): string {
  if (!lastFour) return "•••• •••• •••• ••••";
  return `•••• •••• •••• ${lastFour}`;
}

export function formatMaskedAccountFromLastFour(lastFour: string): string {
  if (!lastFour) return "••••••••";
  return `•••• ${lastFour}`;
}
