import type { LedgerCategory, TransactionType } from "@/lib/finance/constants";

/**
 * Keyword → category heuristics for Indian UPI/bank narrations. First match wins.
 *
 * Patterns are matched against the upper-cased narration. Merchant tokens are kept
 * loose (substring) so concatenated UPI handles like "SARAFOODS" or "ASHRAMKIRANA"
 * still match; short financial tokens use `\b…\b` so "EMI" doesn't fire inside
 * "prEMIum" and "ACH" doesn't fire inside "mACHine".
 */
const RULES: Array<{ category: LedgerCategory; pattern: RegExp }> = [
  { category: "Healthcare", pattern: /MEDICAL|PHARMA|HOSPITAL|CLINIC|CHEMIST|DIAGNOSTIC/ },
  { category: "Food", pattern: /KIRANA|FRESH|DAIRY|DUGDHALAYA|SWIGGY|ZOMATO|RESTAURANT|HOTEL|BAKERY|CAFE|FOODS|GROCERY/ },
  { category: "Transport", pattern: /FUEL|PETROL|HPCL|IOCL|BPCL|UBER|OLA|RAPIDO|IRCTC|TOLL|FASTAG|PARKING/ },
  { category: "Utilities", pattern: /ELECTRIC|MSEB|MAHADISCOM|RECHARGE|JIO|AIRTEL|VODAFONE|BROADBAND|BILLPAY|BILLDESK/ },
  { category: "Subscriptions", pattern: /NETFLIX|PRIME|SPOTIFY|HOTSTAR|YOUTUBE|SUBSCRIPTION/ },
  { category: "Shopping", pattern: /AMAZON|FLIPKART|MYNTRA|MEESHO|AJIO|RETAIL|MALL/ },
  { category: "Entertainment", pattern: /BOOKMYSHOW|PVR|INOX|CINEMA|MOVIE|GAMING/ },
  { category: "EMI", pattern: /\bEMI\b|\bLOAN\b|\bNACH\b|\bENACH\b|\bACH\b/ },
];

/**
 * Suggest a ledger category from a narration. Credits default to "Income",
 * debits to "Miscellaneous" unless a keyword rule matches.
 */
export function suggestCategory(
  description: string,
  type: TransactionType
): LedgerCategory {
  const text = description.toUpperCase();
  for (const rule of RULES) {
    if (rule.pattern.test(text)) return rule.category;
  }
  return type === "credit" ? "Income" : "Miscellaneous";
}
