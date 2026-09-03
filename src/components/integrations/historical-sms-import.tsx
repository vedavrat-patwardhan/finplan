"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArchiveRestore,
  CheckCircle2,
  FileSearch,
  LoaderCircle,
  MessageSquareLock,
  Upload,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

interface SmsCandidate {
  sender: string;
  message: string;
  timestamp: number;
}

interface BackupPreview {
  fileName: string;
  totalMessages: number;
  candidates: SmsCandidate[];
  skippedMessages: number;
  oldest?: number;
  newest?: number;
}

interface ImportTotals {
  imported: number;
  needsReview: number;
  duplicates: number;
  failed: number;
  balancesUpdated: number;
  billsUpdated: number;
}

const MAX_BACKUP_BYTES = 75 * 1024 * 1024;
const BATCH_SIZE = 25;
const FINANCE_PATTERN = /\b(debited|credited|spent|paid|sent|received|withdrawn|purchase|upi|imps|neft|rtgs|amount due|total due|minimum due|payment due|statement amount|avl\.?\s*bal|available balance|current balance)\b/i;
const PRIVATE_CODE_PATTERN = /\b(otp|one[- ]time password|verification code|login code|password reset)\b/i;

function formatBackupDate(timestamp?: number) {
  if (!timestamp) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(timestamp));
}

function parseSmsBackup(fileName: string, xml: string): BackupPreview {
  const document = new DOMParser().parseFromString(xml, "application/xml");
  if (document.querySelector("parsererror")) {
    throw new Error("This file is not a valid SMS Backup & Restore XML file.");
  }
  const root = document.documentElement;
  if (root.tagName.toLowerCase() !== "smses") {
    throw new Error("Choose the SMS backup XML, not a call-log or ZIP backup.");
  }

  const smsNodes = Array.from(document.getElementsByTagName("sms"));
  const candidates: SmsCandidate[] = [];
  let skippedMessages = 0;

  for (const node of smsNodes) {
    const isIncoming = node.getAttribute("type") === "1";
    const message = (node.getAttribute("body") ?? "").trim();
    const sender = (node.getAttribute("address") ?? "").trim().slice(0, 80);
    const timestamp = Number(node.getAttribute("date"));
    const isFinancial = FINANCE_PATTERN.test(message) && !PRIVATE_CODE_PATTERN.test(message);

    if (!isIncoming || !message || !Number.isFinite(timestamp) || !isFinancial) {
      skippedMessages += 1;
      continue;
    }
    candidates.push({ sender, message: message.slice(0, 3000), timestamp });
  }

  candidates.sort((left, right) => left.timestamp - right.timestamp);
  return {
    fileName,
    totalMessages: smsNodes.length,
    candidates,
    skippedMessages,
    oldest: candidates[0]?.timestamp,
    newest: candidates.at(-1)?.timestamp,
  };
}

export function HistoricalSmsImport() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<BackupPreview | null>(null);
  const [scanning, setScanning] = useState(false);
  const [importing, setImporting] = useState(false);
  const [processed, setProcessed] = useState(0);
  const [updateBalances, setUpdateBalances] = useState(true);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ImportTotals | null>(null);

  async function chooseBackup(file?: File) {
    if (!file) return;
    setScanning(true);
    setError("");
    setResult(null);
    setPreview(null);
    try {
      if (file.size > MAX_BACKUP_BYTES) {
        throw new Error("The backup is larger than 75 MB. Export only bank conversations and try again.");
      }
      const xml = await file.text();
      setPreview(parseSmsBackup(file.name, xml));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to read this backup.");
    } finally {
      setScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function importHistory() {
    if (!preview?.candidates.length || importing) return;
    setImporting(true);
    setProcessed(0);
    setError("");
    setResult(null);
    const totals: ImportTotals = {
      imported: 0,
      needsReview: 0,
      duplicates: 0,
      failed: 0,
      balancesUpdated: 0,
      billsUpdated: 0,
    };

    try {
      for (let index = 0; index < preview.candidates.length; index += BATCH_SIZE) {
        const messages = preview.candidates.slice(index, index + BATCH_SIZE);
        const response = await fetch("/api/ingest/sms/history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages }),
        });
        const data = await response.json() as Partial<ImportTotals> & { error?: string };
        if (!response.ok) throw new Error(data.error || "A history batch could not be imported.");
        totals.imported += data.imported ?? 0;
        totals.needsReview += data.needsReview ?? 0;
        totals.duplicates += data.duplicates ?? 0;
        totals.failed += data.failed ?? 0;
        setProcessed(Math.min(index + messages.length, preview.candidates.length));
      }

      if (updateBalances) {
        const response = await fetch("/api/ingest/sms/history/reconcile", { method: "POST" });
        const data = await response.json() as Partial<ImportTotals> & { error?: string };
        if (!response.ok) throw new Error(data.error || "Messages imported, but balances could not be reconciled.");
        totals.balancesUpdated = data.balancesUpdated ?? 0;
        totals.billsUpdated = data.billsUpdated ?? 0;
      }

      setResult(totals);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The history import stopped unexpectedly.");
    } finally {
      setImporting(false);
    }
  }

  const progress = preview?.candidates.length
    ? Math.round((processed / preview.candidates.length) * 100)
    : 0;

  return (
    <Card>
      <CardHeader className="border-b border-border">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center border border-border bg-muted text-brand-text">
            <ArchiveRestore className="size-5" />
          </span>
          <div>
            <CardTitle>Backfill message history</CardTitle>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Scan an Android SMS backup for past transactions, balances, and card bills.
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 border border-border bg-muted p-4 sm:grid-cols-[1fr_auto] sm:items-center">
          <div>
            <p className="text-sm font-bold">1. Export messages as XML</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Use SMS Backup &amp; Restore by SyncTech. Choose SMS only and save an unencrypted local XML file.
            </p>
          </div>
          <a
            href="https://play.google.com/store/apps/details?id=com.riteshsahu.SMSBackupRestore"
            target="_blank"
            rel="noreferrer"
            className="text-sm font-semibold text-foreground hover:underline"
          >
            Get Android app
          </a>
        </div>

        <div className="border border-dashed border-input bg-card px-6 py-10 text-center">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xml,application/xml,text/xml"
            className="sr-only"
            onChange={(event) => void chooseBackup(event.target.files?.[0])}
          />
          <button
            type="button"
            disabled={scanning || importing}
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full flex-col items-center justify-center disabled:opacity-60"
          >
            <span className="flex size-12 items-center justify-center border border-border bg-muted">
              {scanning ? <LoaderCircle className="size-6 animate-spin text-brand-text" /> : <Upload className="size-6 text-brand-text" />}
            </span>
            <span className="mt-3 text-sm font-bold">{scanning ? "Scanning on this phone…" : "Choose SMS backup XML"}</span>
            <span className="mt-1 text-xs text-muted-foreground">The full backup is never uploaded</span>
          </button>
        </div>

        {preview ? (
          <div className="space-y-4 border border-border bg-card p-4">
            <div className="flex items-start gap-3">
              <FileSearch className="mt-0.5 size-5 shrink-0 text-brand-text" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{preview.fileName}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatBackupDate(preview.oldest)} – {formatBackupDate(preview.newest)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-muted px-2 py-3">
                <p className="text-lg font-extrabold tabular-nums">{preview.totalMessages.toLocaleString("en-IN")}</p>
                <p className="np-caps mt-1 text-muted-foreground">SMS scanned</p>
              </div>
              <div className="bg-muted px-2 py-3">
                <p className="text-lg font-extrabold tabular-nums text-success-text">{preview.candidates.length.toLocaleString("en-IN")}</p>
                <p className="np-caps mt-1 text-muted-foreground">Financial</p>
              </div>
              <div className="bg-muted px-2 py-3">
                <p className="text-lg font-extrabold tabular-nums">{preview.skippedMessages.toLocaleString("en-IN")}</p>
                <p className="np-caps mt-1 text-muted-foreground">Kept private</p>
              </div>
            </div>

            <label className="flex cursor-pointer items-start justify-between gap-3 border border-border bg-card p-3">
              <span>
                <span className="block text-sm font-bold">Update balances from bank-reported values</span>
                <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                  Uses only the newest explicit available balance per matched account. Old debits and credits are never replayed against today’s balance.
                </span>
              </span>
              <Switch
                checked={updateBalances}
                disabled={importing}
                onCheckedChange={(checked) => setUpdateBalances(checked)}
                className="mt-0.5 shrink-0"
              />
            </label>

            {importing ? (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Keep FinPlan open while the archive is imported</span>
                  <span className="tabular-nums">{progress}%</span>
                </div>
                <div className="h-2 bg-muted">
                  <div className="h-full bg-brand transition-[width] duration-300" style={{ width: `${progress}%` }} />
                </div>
              </div>
            ) : null}

            <Button
              type="button"
              variant="brand"
              disabled={!preview.candidates.length || importing}
              onClick={() => void importHistory()}
              className="w-full sm:w-auto"
            >
              {importing ? <LoaderCircle className="animate-spin" /> : <ArchiveRestore />}
              {importing ? `Importing ${processed.toLocaleString("en-IN")} of ${preview.candidates.length.toLocaleString("en-IN")}` : `Import ${preview.candidates.length.toLocaleString("en-IN")} financial messages`}
            </Button>
          </div>
        ) : null}

        {result ? (
          <div className="space-y-3 border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-sm font-bold text-success-text">
              <CheckCircle2 className="size-4" /> History sync complete
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="success">{result.imported.toLocaleString("en-IN")} imported</Badge>
              <Badge variant="warning">{result.needsReview.toLocaleString("en-IN")} need review</Badge>
              <Badge variant="outline">{result.duplicates.toLocaleString("en-IN")} duplicates</Badge>
              {result.failed > 0 ? <Badge variant="destructive">{result.failed.toLocaleString("en-IN")} failed</Badge> : null}
            </div>
            {updateBalances ? (
              <p className="text-xs leading-relaxed text-muted-foreground">
                {result.balancesUpdated} bank balances and {result.billsUpdated} upcoming card bills refreshed.
              </p>
            ) : null}
          </div>
        ) : null}

        {error ? <p className="border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}

        <p className={`flex items-start gap-2 text-[11px] leading-relaxed text-muted-foreground${preview ? " pt-1" : ""}`}>
          <MessageSquareLock className="mt-0.5 size-3.5 shrink-0" />
          OTPs, outgoing messages, and non-financial conversations stay on your device. Only filtered financial candidates are sent to FinPlan.
        </p>
      </CardContent>
    </Card>
  );
}
