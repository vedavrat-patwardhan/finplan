"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import {
  Check,
  Clipboard,
  KeyRound,
  MessageSquareText,
  RadioTower,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import {
  approveMessageAction,
  disableSmsIngestionAction,
  dismissMessageAction,
  generateSmsTokenAction,
  ingestManualMessageAction,
  type IntegrationActionState,
} from "@/actions/integrations";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatDate, formatINR } from "@/lib/format";
import type { PaymentAccountDTO } from "@/lib/db/queries/ledger";
import { cn } from "@/lib/utils";
import { HistoricalSmsImport } from "@/components/integrations/historical-sms-import";

type IngestionItem = {
  id: string;
  sender: string;
  message: string;
  occurredAt: string;
  historical: boolean;
  kind: string;
  status: string;
  confidence: number;
  accountId?: string;
  transactionId?: string;
  parsed: {
    type?: string;
    amount?: number;
    category?: string;
    merchant: string;
    accountLastFour: string;
    availableBalance?: number;
    billTotalDue?: number;
    billDueDate?: string;
  };
};

const initialState: IntegrationActionState = { success: false };

const SETUP_STEPS: React.ReactNode[] = [
  <>Install MacroDroid, Tasker, or Automate and create an &ldquo;SMS received&rdquo; trigger.</>,
  <>Filter senders to your bank IDs (for example HDFCBK, AXISBK, ICICIB).</>,
  <>Add an HTTP POST action using the webhook URL and token above.</>,
  <>
    Send JSON with <code className="bg-muted px-1 font-mono">sender</code>,{" "}
    <code className="bg-muted px-1 font-mono">message</code>, and an optional{" "}
    <code className="bg-muted px-1 font-mono">timestamp</code>.
  </>,
];

function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={copy}
      aria-label={copied ? "Copied" : label}
    >
      {copied ? <Check /> : <Clipboard />}
    </Button>
  );
}

function SmsTokenPanel({ enabled, hint, webhookUrl }: { enabled: boolean; hint: string; webhookUrl: string }) {
  const [state, action, pending] = useActionState(generateSmsTokenAction, initialState);
  const curlExample = `POST ${webhookUrl}\nAuthorization: Bearer ${state.token ?? "YOUR_TOKEN"}\nContent-Type: application/json\n\n{"sender":"%SMSRF","message":"%SMSRB","timestamp":"%TIMES"}`;

  return (
    <Card elevated>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2">
              <RadioTower className="size-4 text-brand-text" /> Secure SMS webhook
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Your Android automation forwards only bank messages you choose.
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <Badge variant={enabled ? "success" : "warning"}>
              {enabled ? "Connected" : "Setup needed"}
            </Badge>
            {enabled && hint ? (
              <span className="np-caps text-muted-foreground">•••{hint}</span>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="np-caps text-muted-foreground">Webhook URL</p>
          <div className="mt-2 flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate border border-input bg-input-bg px-3 py-2 font-mono text-sm break-all">
              {webhookUrl}
            </code>
            <CopyButton value={webhookUrl} label="Copy webhook URL" />
          </div>
        </div>

        {state.token ? (
          <div>
            <p className="np-caps text-warning-text">Copy this token now</p>
            <p className="mt-1 text-xs text-muted-foreground">For security, FinPlan stores only its fingerprint.</p>
            <div className="mt-2 flex items-center gap-2">
              <code className="min-w-0 flex-1 border border-input bg-input-bg px-3 py-2 font-mono text-sm break-all">
                {state.token}
              </code>
              <CopyButton value={state.token} label="Copy token" />
            </div>
          </div>
        ) : null}

        {state.message ? <p className="text-sm text-success-text">{state.message}</p> : null}
        {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

        <div className="flex flex-wrap gap-2">
          <form action={action}>
            <Button type="submit" variant="brand" disabled={pending}>
              {enabled ? <RefreshCw /> : <KeyRound />}
              {pending ? "Generating…" : enabled ? "Rotate token" : "Generate token"}
            </Button>
          </form>
          {enabled ? (
            <form action={disableSmsIngestionAction}>
              <Button
                type="submit"
                variant="destructive"
                onClick={(event) => {
                  if (!window.confirm("Disable SMS ingestion? Your webhook token will stop working immediately.")) {
                    event.preventDefault();
                  }
                }}
              >
                Disable
              </Button>
            </form>
          ) : null}
        </div>

        <details className="border border-border bg-card">
          <summary className="np-caps cursor-pointer list-none p-4 text-foreground">
            Android setup recipe
          </summary>
          <ol className="space-y-3 border-t border-border p-4 text-sm leading-relaxed text-muted-foreground">
            {SETUP_STEPS.map((stepText, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center border border-foreground np-caps text-foreground">
                  {i + 1}
                </span>
                <span className="pt-0.5">{stepText}</span>
              </li>
            ))}
          </ol>
          <pre className="mx-4 mb-4 overflow-x-auto border border-input bg-input-bg p-3 font-mono text-[11px] leading-relaxed">{curlExample}</pre>
        </details>
      </CardContent>
    </Card>
  );
}

function ManualMessageTest() {
  const [state, action, pending] = useActionState(ingestManualMessageAction, initialState);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquareText className="size-4 text-brand-text" /> Test with a bank message
        </CardTitle>
        <p className="text-sm text-muted-foreground">Paste one real SMS to preview the same parser used by the webhook.</p>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-3">
          <Input name="sender" placeholder="Sender, e.g. AX-HDFCBK" />
          <Textarea name="message" required rows={5} className="min-h-28" placeholder="Your A/c XX1234 is debited by Rs. 450.00 via UPI to…" />
          {state.message ? <p className="text-sm text-success-text">{state.message}</p> : null}
          {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
          <Button type="submit" disabled={pending}>{pending ? "Reading message…" : "Parse and import"}</Button>
        </form>
      </CardContent>
    </Card>
  );
}

function statusBadgeVariant(status: string): "success" | "warning" | "outline" | "destructive" {
  if (status === "imported") return "success";
  if (status === "needs_review") return "warning";
  if (status === "error") return "destructive";
  return "outline";
}

function statusLabel(status: string): string {
  if (status === "needs_review") return "review";
  if (status === "ignored") return "dismissed";
  if (status === "error") return "failed";
  return status.replace("_", " ");
}

function MessageRow({
  item,
  accounts,
  categories,
}: {
  item: IngestionItem;
  accounts: PaymentAccountDTO[];
  categories: string[];
}) {
  const needsReview = item.status === "needs_review";
  const amount = item.parsed.amount ?? item.parsed.billTotalDue ?? item.parsed.availableBalance;
  return (
    <article className="border-t border-border px-5 py-4 first:border-t-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-bold">{item.parsed.merchant || item.sender || (item.kind === "bill" ? "Credit card bill" : "Bank message")}</p>
            <Badge variant={statusBadgeVariant(item.status)}>{statusLabel(item.status)}</Badge>
            {item.historical ? <Badge variant="secondary">history</Badge> : null}
          </div>
          <p className="mt-1 np-caps text-muted-foreground">{item.sender || "Unknown sender"} · {formatDate(item.occurredAt)}</p>
        </div>
        {amount !== undefined ? (
          <p className={cn("shrink-0 font-extrabold tabular-nums", item.parsed.type === "credit" ? "text-success-text" : "text-foreground")}>
            {item.parsed.type === "credit" ? "+" : item.parsed.type === "debit" ? "−" : ""}{formatINR(amount, { compact: true })}
          </p>
        ) : null}
      </div>
      <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{item.message}</p>

      {item.confidence > 0 ? (
        <div className="mt-3 flex items-center gap-2">
          <span className="np-caps shrink-0 text-muted-foreground">Confidence</span>
          <div className="h-1 w-full max-w-40 bg-muted">
            <div className="h-full bg-brand" style={{ width: `${Math.round(item.confidence * 100)}%` }} />
          </div>
        </div>
      ) : null}

      {needsReview && (item.kind === "transaction" || item.kind === "bill" || item.kind === "balance") ? (
        <form action={approveMessageAction} className="mt-4 grid gap-2 border-t border-border pt-3 sm:grid-cols-[1fr_1fr_auto]">
          <input type="hidden" name="eventId" value={item.id} />
          <Select name="accountId" required defaultValue={item.accountId ?? ""}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose account" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.name}{account.lastFour ? ` · ${account.lastFour}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {item.kind === "bill" || item.kind === "balance" ? (
            <input type="hidden" name="category" value="Miscellaneous" />
          ) : (
            <Select name="category" defaultValue={item.parsed.category ?? "Miscellaneous"}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button type="submit" size="sm"><Check /> Approve</Button>
        </form>
      ) : null}
      {needsReview ? (
        <form action={dismissMessageAction} className="mt-2">
          <input type="hidden" name="eventId" value={item.id} />
          <Button type="submit" variant="ghost" size="sm" className="text-muted-foreground"><X /> Ignore</Button>
        </form>
      ) : null}
    </article>
  );
}

export function AutomationCenter({ settings, webhookUrl, ingestions, accounts, categories }: {
  settings: { smsEnabled: boolean; smsTokenHint: string };
  webhookUrl: string;
  ingestions: IngestionItem[];
  accounts: PaymentAccountDTO[];
  categories: string[];
}) {
  const reviewCount = ingestions.filter((item) => item.status === "needs_review").length;
  const importedCount = ingestions.filter((item) => item.status === "imported").length;
  return (
    <div className="space-y-8">
      <section className="grid gap-3 sm:grid-cols-3">
        <Card elevated size="sm">
          <CardContent className="space-y-3">
            <ShieldCheck className="size-5 text-brand-text" />
            <p className="text-base font-bold">Private by design</p>
            <p className="text-xs leading-relaxed text-muted-foreground">No blanket inbox access. You decide which senders are forwarded.</p>
          </CardContent>
        </Card>
        <Card elevated size="sm">
          <CardContent className="space-y-3">
            <Sparkles className="size-5 text-brand-text" />
            <p className="text-lg font-extrabold tabular-nums">{importedCount} auto-updated</p>
            <p className="text-xs leading-relaxed text-muted-foreground">Transactions and card bills matched with high confidence.</p>
          </CardContent>
        </Card>
        <Card elevated size="sm">
          <CardContent className="space-y-3">
            <MessageSquareText className="size-5 text-brand-text" />
            <p className="text-lg font-extrabold tabular-nums">{reviewCount} to review</p>
            <p className="text-xs leading-relaxed text-muted-foreground">Ambiguous messages wait for you instead of changing balances.</p>
          </CardContent>
        </Card>
      </section>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <SmsTokenPanel enabled={settings.smsEnabled} hint={settings.smsTokenHint} webhookUrl={webhookUrl} />
        <ManualMessageTest />
      </div>

      <HistoricalSmsImport />

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-bold">Message activity</h2>
            <p className="text-sm text-muted-foreground">Most recent messages, imports, and review decisions.</p>
          </div>
          <Link href="/transactions" className="text-sm font-semibold text-foreground hover:underline">Open ledger</Link>
        </div>
        {ingestions.length ? (
          <Card className="gap-0 py-0">
            {ingestions.map((item) => <MessageRow key={item.id} item={item} accounts={accounts} categories={categories} />)}
          </Card>
        ) : (
          <div className="border border-dashed border-input bg-card p-8 text-center text-sm text-muted-foreground">No messages yet. Paste one above to test the flow.</div>
        )}
      </section>
    </div>
  );
}
