"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  FileText,
  Loader2,
  Check,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  Landmark,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { LabeledSelect } from "@/components/ui/labeled-select";
import { PasswordInput } from "@/components/ui/password-input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  extractStatementAction,
  importStatementTransactionsAction,
} from "@/actions/statement-import";
import type { ParsedTransaction } from "@/lib/finance/statement-parsers";
import { LEDGER_CATEGORIES, STATEMENT_BANKS } from "@/lib/finance/constants";
import type { StatementBank } from "@/lib/finance/constants";
import { STATEMENT_BANK_LABELS } from "@/lib/finance/statement-parsers";
import { formatINR, formatDate } from "@/lib/format";
import { sortPaymentAccounts } from "@/lib/finance/ledger";
import type { PaymentAccountDTO, SavedPasswordDTO } from "@/lib/db/queries/ledger";

type Row = ParsedTransaction & { include: boolean };

const bankOptions = STATEMENT_BANKS.map((b) => ({
  value: b,
  label: STATEMENT_BANK_LABELS[b],
}));

const categoryOptions = LEDGER_CATEGORIES.map((c) => ({ value: c, label: c }));
const MANUAL_PASSWORD = "__manual__";

const BANK_INSTITUTION_MATCH: Record<StatementBank, string> = {
  hdfc: "hdfc",
  kotak: "kotak",
  yes: "yes bank",
  axis: "axis",
  bob: "bank of baroda",
};

function Divider() {
  return <span aria-hidden className="hidden h-8 w-px bg-border sm:block" />;
}

function Stat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "success";
}) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "text-sm font-semibold tabular-nums",
          tone === "success" ? "text-success" : "text-foreground"
        )}
      >
        {value}
      </p>
    </div>
  );
}

export function StatementImport({
  accounts,
  savedPasswords,
  onImported,
}: {
  accounts: PaymentAccountDTO[];
  savedPasswords: SavedPasswordDTO[];
  onImported: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [bank, setBank] = useState<string>(STATEMENT_BANKS[0]);
  const [fileName, setFileName] = useState<string>("");
  const [password, setPassword] = useState("");
  const [savedPasswordId, setSavedPasswordId] = useState("");
  const [extracting, startExtract] = useTransition();
  const [importing, startImport] = useTransition();

  const [rows, setRows] = useState<Row[] | null>(null);
  const [accountId, setAccountId] = useState("");
  const [period, setPeriod] = useState<{ start?: string; end?: string }>({});
  /** Last 4 of the account number read off the statement, and whether it auto-matched an account. */
  const [stmtLast4, setStmtLast4] = useState<string | undefined>();
  const [autoMatched, setAutoMatched] = useState(false);
  const [billData, setBillData] = useState<{ totalAmountDue?: number; paymentDueDate?: string }>({});
  const [closingBalance, setClosingBalance] = useState<number | undefined>();
  const [syncClosingBalance, setSyncClosingBalance] = useState(true);

  const importableAccounts = useMemo(() => sortPaymentAccounts(accounts), [accounts]);
  const selectedAccount = useMemo(
    () => accounts.find((account) => account.id === accountId),
    [accountId, accounts]
  );

  const included = useMemo(() => rows?.filter((r) => r.include) ?? [], [rows]);
  const totals = useMemo(() => {
    let debit = 0;
    let credit = 0;
    for (const r of included) {
      if (r.type === "debit") debit += r.amount;
      else credit += r.amount;
    }
    return { debit, credit, net: credit - debit };
  }, [included]);

  function handleExtract() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      toast.error("Choose a PDF file first");
      return;
    }
    const fd = new FormData();
    fd.set("bank", bank);
    fd.set("file", file);
    fd.set("password", savedPasswordId === MANUAL_PASSWORD || savedPasswords.length === 0 ? password : "");
    fd.set(
      "savedPasswordId",
      savedPasswordId && savedPasswordId !== MANUAL_PASSWORD ? savedPasswordId : ""
    );

    startExtract(async () => {
      const result = await extractStatementAction({ success: false }, fd);
      if (result.success && result.transactions) {
        setRows(result.transactions.map((t) => ({ ...t, include: true })));
        setPeriod({ start: result.periodStart, end: result.periodEnd });
        // Suggest an account whose last 4 matches the statement — but make the match
        // visible so the user can confirm or override before importing.
        const lastFourMatches = result.accountNumberLast4
          ? accounts.filter((account) => account.lastFour === result.accountNumberLast4)
          : [];
        const institutionNeedle = BANK_INSTITUTION_MATCH[bank as StatementBank];
        const match =
          lastFourMatches.find((account) =>
            account.institution.toLowerCase().includes(institutionNeedle)
          ) ?? (lastFourMatches.length === 1 ? lastFourMatches[0] : undefined);
        setStmtLast4(result.accountNumberLast4);
        setAccountId(match?.id ?? "");
        setAutoMatched(Boolean(match));
        setBillData({ totalAmountDue: result.totalAmountDue, paymentDueDate: result.paymentDueDate });
        setClosingBalance(result.closingBalance);
        setSyncClosingBalance(result.closingBalance !== undefined);
        toast.success(`Found ${result.transactions.length} transactions`);
      } else {
        if (result.needsPassword === "missing" && savedPasswords.length > 0) {
          setSavedPasswordId(MANUAL_PASSWORD);
        }
        toast.error(result.error ?? "Could not read the statement");
      }
    });
  }

  function handleImport() {
    if (!accountId) {
      toast.error("Select the account to import into");
      return;
    }
    if (included.length === 0) {
      toast.error("Select at least one transaction");
      return;
    }
    const fd = new FormData();
    fd.set("accountId", accountId);
    if (billData.totalAmountDue != null) fd.set("billTotalDue", String(billData.totalAmountDue));
    if (billData.paymentDueDate) fd.set("billDueDate", billData.paymentDueDate);
    if (syncClosingBalance && closingBalance !== undefined && selectedAccount?.type === "bank") {
      fd.set("statementClosingBalance", String(closingBalance));
    }
    fd.set(
      "transactions",
      JSON.stringify(
        included.map((r) => ({
          date: r.date,
          amount: r.amount,
          type: r.type,
          category: r.category,
          merchant: r.merchant,
          description: r.description,
        }))
      )
    );
    startImport(async () => {
      const result = await importStatementTransactionsAction({ success: false }, fd);
      if (result.success) {
        const overrideNote = result.overridden
          ? ` and refreshed ${result.overridden} matching transaction${result.overridden === 1 ? "" : "s"} from the statement`
          : "";
        toast.success(
          result.imported === 0
            ? result.overridden
              ? `Refreshed ${result.overridden} matching transaction${result.overridden === 1 ? "" : "s"} from the statement${result.balanceUpdated ? " and synced the closing balance" : ""}.`
              : result.balanceUpdated
                ? "The account balance was refreshed from the statement."
                : "No new or matching transactions were found."
            : `Imported ${result.imported} transaction${result.imported === 1 ? "" : "s"}${overrideNote}${result.balanceUpdated ? " and synced the closing balance" : ""}`
        );
        resetAll();
        onImported();
      } else {
        toast.error(result.error ?? "Import failed");
      }
    });
  }

  function resetAll() {
    setRows(null);
    setFileName("");
    setPassword("");
    setSavedPasswordId("");
    setAccountId("");
    setStmtLast4(undefined);
    setAutoMatched(false);
    setBillData({});
    setClosingBalance(undefined);
    setSyncClosingBalance(true);
    if (fileRef.current) fileRef.current.value = "";
  }

  function updateRow(index: number, patch: Partial<Row>) {
    setRows((prev) =>
      prev ? prev.map((r, i) => (i === index ? { ...r, ...patch } : r)) : prev
    );
  }

  function toggleAll(include: boolean) {
    setRows((prev) => (prev ? prev.map((r) => ({ ...r, include })) : prev));
  }

  return (
    <section className="space-y-6 rounded-xl border border-border bg-card p-5 sm:p-6 section-break">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <FileText className="size-5" />
        </span>
        <div className="space-y-0.5">
          <h2 className="font-heading text-lg font-semibold leading-tight">
            Import statement
          </h2>
          <p className="text-sm text-muted-foreground">
            Bank or credit-card PDF — read on your server, never uploaded anywhere.
          </p>
        </div>
      </div>

      {!rows ? (
        <div className="space-y-5">
          {/* Primary input: the file drop target */}
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className={cn(
              "flex w-full items-center gap-3 rounded-xl border border-dashed px-4 py-4 text-left transition-colors",
              fileName
                ? "border-primary/40 bg-primary/5"
                : "border-border hover:border-primary/40 hover:bg-muted/40"
            )}
          >
            <span
              className={cn(
                "grid size-10 shrink-0 place-items-center rounded-lg",
                fileName ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
              )}
            >
              {fileName ? <Check className="size-5" /> : <FileText className="size-5" />}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">
                {fileName || "Choose a PDF statement"}
              </span>
              <span className="block text-xs text-muted-foreground">
                {fileName ? "Tap to replace" : "PDF only · up to 15 MB"}
              </span>
            </span>
          </button>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Bank</Label>
              <LabeledSelect
                value={bank}
                onValueChange={setBank}
                options={bankOptions}
                placeholder="Select bank"
              />
            </div>

            {savedPasswords.length > 0 ? (
              <div className="space-y-2">
                <Label>PDF password (optional)</Label>
                <LabeledSelect
                  value={savedPasswordId}
                  onValueChange={(id) => {
                    setSavedPasswordId(id);
                    if (id !== MANUAL_PASSWORD) setPassword("");
                  }}
                  options={[
                    { value: "", label: "No password" },
                    { value: MANUAL_PASSWORD, label: "Enter password…" },
                    ...savedPasswords.map((p) => ({ value: p.id, label: p.title })),
                  ]}
                  placeholder="No password"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="stmt-password">PDF password (optional)</Label>
                <PasswordInput
                  id="stmt-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Leave blank if it opens normally"
                />
              </div>
            )}
          </div>

          {savedPasswords.length > 0 && savedPasswordId === MANUAL_PASSWORD && (
            <div className="space-y-2">
              <Label htmlFor="stmt-password">Enter PDF password</Label>
              <PasswordInput
                id="stmt-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter the PDF password"
              />
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="size-3.5 shrink-0" />
              Decrypted in memory — the file is never stored.
            </p>
            <Button
              type="button"
              className="gap-2"
              disabled={extracting}
              onClick={handleExtract}
            >
              {extracting ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Extracting…
                </>
              ) : (
                "Extract transactions"
              )}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Summary strip */}
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3 rounded-xl border border-border bg-muted/30 px-4 py-3.5">
            <Stat label="Selected" value={`${included.length} of ${rows.length}`} />
            <Divider />
            <Stat label="Money in" value={`+${formatINR(totals.credit)}`} tone="success" />
            <Stat label="Money out" value={`−${formatINR(totals.debit)}`} />
            <Divider />
            <Stat
              label="Net"
              value={`${totals.net >= 0 ? "+" : "−"}${formatINR(Math.abs(totals.net))}`}
              tone={totals.net >= 0 ? "success" : "default"}
            />
            {period.start && period.end && (
              <>
                <Divider />
                <Stat
                  label="Period"
                  value={`${formatDate(period.start)} – ${formatDate(period.end)}`}
                />
              </>
            )}
          </div>

          {/* Destination account + bulk selection */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="w-full space-y-2 sm:max-w-sm">
              <Label htmlFor="import-account">Import into account</Label>
              <LabeledSelect
                value={accountId}
                onValueChange={(id) => {
                  setAccountId(id);
                  setAutoMatched(false);
                }}
                options={importableAccounts.map((a) => ({
                  value: a.id,
                  label: `${a.name}${a.lastFour ? ` •••• ${a.lastFour}` : ""}`,
                }))}
                placeholder="Select account"
              />
              {autoMatched && stmtLast4 ? (
                <p className="flex items-center gap-1.5 text-xs text-success">
                  <Check className="size-3.5 shrink-0" />
                  Matched to your account ending {stmtLast4} — change above if that&apos;s wrong.
                </p>
              ) : stmtLast4 ? (
                <p className="text-xs text-warning">
                  Statement is for an account ending {stmtLast4} — pick the matching account.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Choose which account these transactions belong to.
                </p>
              )}
            </div>
            <div className="flex items-center gap-1 text-sm">
              <Button type="button" variant="ghost" size="sm" onClick={() => toggleAll(true)}>
                Select all
              </Button>
              <span className="text-border">·</span>
              <Button type="button" variant="ghost" size="sm" onClick={() => toggleAll(false)}>
                Clear
              </Button>
            </div>
          </div>

          {closingBalance !== undefined ? (
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-primary/20 bg-primary/[0.035] p-4">
              <input
                type="checkbox"
                checked={syncClosingBalance}
                disabled={selectedAccount?.type !== "bank"}
                onChange={(event) => setSyncClosingBalance(event.target.checked)}
                className="mt-0.5 size-4 accent-primary"
              />
              <Landmark className="mt-0.5 size-4 shrink-0 text-primary" />
              <span className="min-w-0">
                <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="text-sm font-medium">Set account to statement closing balance</span>
                  <span className="font-heading text-base font-semibold tabular-nums text-primary">
                    {formatINR(closingBalance)}
                  </span>
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                  Recommended for a complete bank statement. This sets the balance once instead of replaying every transaction against the balance already in FinPlan.
                </span>
                {selectedAccount && selectedAccount.type !== "bank" ? (
                  <span className="mt-1 block text-xs text-warning">Choose a bank account to enable balance reconciliation.</span>
                ) : null}
              </span>
            </label>
          ) : null}

          {/* Transactions table */}
          <div className="max-h-[26rem] overflow-auto rounded-xl border border-border">
            <Table className="min-w-[640px]">
              <TableHeader className="sticky top-0 z-10 bg-muted/80 backdrop-blur">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-10" />
                  <TableHead className="w-24">Date</TableHead>
                  <TableHead>Merchant</TableHead>
                  <TableHead className="w-40">Category</TableHead>
                  <TableHead className="w-[5.5rem]">Type</TableHead>
                  <TableHead className="w-32 text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow
                    key={i}
                    data-state={r.include ? undefined : "muted"}
                    className={cn(
                      "transition-opacity",
                      r.include ? "" : "opacity-45"
                    )}
                  >
                    <TableCell className="py-2">
                      <label className="flex size-9 cursor-pointer items-center justify-center">
                        <input
                          type="checkbox"
                          checked={r.include}
                          onChange={(e) => updateRow(i, { include: e.target.checked })}
                          className="size-4 accent-primary"
                        />
                      </label>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">
                      {formatDate(r.date)}
                    </TableCell>
                    <TableCell className="max-w-[18rem]">
                      <span
                        className="block truncate text-sm font-medium"
                        title={r.description}
                      >
                        {r.merchant || r.description}
                      </span>
                    </TableCell>
                    <TableCell>
                      <LabeledSelect
                        value={r.category}
                        onValueChange={(v) => updateRow(i, { category: v as never })}
                        options={categoryOptions}
                        placeholder="Category"
                      />
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() =>
                          updateRow(i, {
                            type: r.type === "debit" ? "credit" : "debit",
                          })
                        }
                        title="Click to flip direction"
                        className={cn(
                          "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors",
                          r.type === "credit"
                            ? "bg-success/10 text-success hover:bg-success/15"
                            : "bg-secondary text-secondary-foreground hover:bg-accent"
                        )}
                      >
                        {r.type === "credit" ? (
                          <ArrowDownLeft className="size-3" />
                        ) : (
                          <ArrowUpRight className="size-3" />
                        )}
                        {r.type === "credit" ? "In" : "Out"}
                      </button>
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right text-sm font-medium tabular-nums",
                        r.type === "credit" ? "text-success" : "text-foreground"
                      )}
                    >
                      {r.type === "credit" ? "+" : "−"}
                      {formatINR(r.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              className="gap-2"
              disabled={importing || included.length === 0}
              onClick={handleImport}
            >
              {importing ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Importing…
                </>
              ) : (
                <>
                  <Check className="size-4" /> Import {included.length}{" "}
                  {included.length === 1 ? "transaction" : "transactions"}
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={importing}
              onClick={resetAll}
            >
              Start over
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
