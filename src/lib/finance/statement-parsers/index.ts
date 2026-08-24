import type { StatementBank } from "@/lib/finance/constants";
import { extractPdfPages } from "./extract-text";
import { parseHdfcStatement } from "./hdfc";
import { parseYesStatement } from "./yes";
import { parseAxisStatement } from "./axis";
import { parseBobStatement } from "./bob";
import { parseKotakStatement } from "./kotak";
import type { ParsedStatement } from "./types";

export { PdfPasswordError } from "./extract-text";
export type { ParsedStatement, ParsedTransaction } from "./types";

const PARSERS: Record<StatementBank, (pages: Awaited<ReturnType<typeof extractPdfPages>>) => ParsedStatement> = {
  hdfc: parseHdfcStatement,
  yes: parseYesStatement,
  axis: parseAxisStatement,
  bob: parseBobStatement,
  kotak: parseKotakStatement,
};

export const STATEMENT_BANK_LABELS: Record<StatementBank, string> = {
  hdfc: "HDFC Bank",
  yes: "YES Bank (Credit Card)",
  axis: "Axis Bank (Credit Card)",
  bob: "Bank of Baroda (Credit Card)",
  kotak: "Kotak Mahindra Bank",
};

/** Extract a PDF buffer and run the bank-specific parser. */
export async function parseStatementPdf(
  bank: StatementBank,
  buffer: Buffer,
  password?: string
): Promise<ParsedStatement> {
  const pages = await extractPdfPages(buffer, password);
  const parser = PARSERS[bank];
  if (!parser) throw new Error(`No parser for bank: ${bank}`);
  return parser(pages);
}
