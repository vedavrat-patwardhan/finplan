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

/** Indian IFSC: 4 letters + 0 + 6 alphanumeric (11 chars), e.g. HDFC0001234 */
export const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;

export function normalizeIfsc(code: string): string {
  return code.toUpperCase().trim();
}

export function isValidIfsc(code: string): boolean {
  return IFSC_REGEX.test(normalizeIfsc(code));
}

/** Indian bank account numbers are typically 9–18 digits */
export function isValidAccountNumber(value: string): boolean {
  const digits = digitsOnly(value);
  return digits.length >= 9 && digits.length <= 18;
}

/** UPI ID: user@bankhandle */
export const UPI_ID_REGEX = /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z0-9.-]{2,64}$/;

export function isValidUpiId(value: string): boolean {
  return UPI_ID_REGEX.test(value.trim());
}

export function luhnCheck(cardDigits: string): boolean {
  let sum = 0;
  let alternate = false;
  for (let i = cardDigits.length - 1; i >= 0; i--) {
    let digit = parseInt(cardDigits[i]!, 10);
    if (Number.isNaN(digit)) return false;
    if (alternate) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    alternate = !alternate;
  }
  return sum % 10 === 0;
}

/** Card numbers: 13–19 digits; Luhn check when length is 15 or 16 */
export function isValidCardNumber(value: string): boolean {
  const digits = digitsOnly(value);
  if (digits.length < 13 || digits.length > 19) return false;
  if (digits.length === 15 || digits.length === 16) {
    return luhnCheck(digits);
  }
  return true;
}

export function ifscValidationMessage(code: string): string | null {
  const normalized = normalizeIfsc(code);
  if (!normalized) return "IFSC code is required";
  if (normalized.length !== 11) {
    return "IFSC must be exactly 11 characters (e.g. HDFC0001234)";
  }
  if (!IFSC_REGEX.test(normalized)) {
    return "Invalid IFSC format — 4 letters, then 0, then 6 characters (e.g. SBIN0001234)";
  }
  return null;
}

export function accountNumberValidationMessage(value: string): string | null {
  const digits = digitsOnly(value);
  if (!digits) return "Account number is required";
  if (digits.length < 9) return "Account number must be at least 9 digits";
  if (digits.length > 18) return "Account number cannot exceed 18 digits";
  return null;
}

export function cardNumberValidationMessage(value: string): string | null {
  const digits = digitsOnly(value);
  if (!digits) return "Card number is required";
  if (digits.length < 13) return "Card number must be at least 13 digits";
  if (digits.length > 19) return "Card number cannot exceed 19 digits";
  if ((digits.length === 15 || digits.length === 16) && !luhnCheck(digits)) {
    return "Card number failed checksum — check the digits";
  }
  return null;
}

export function upiValidationMessage(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "UPI ID is required";
  if (!isValidUpiId(trimmed)) {
    return "Enter a valid UPI ID (e.g. name@okhdfcbank)";
  }
  return null;
}
