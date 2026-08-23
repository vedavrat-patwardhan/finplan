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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatDate, formatINR } from "@/lib/format";
import { LEDGER_CATEGORIES } from "@/lib/finance/constants";
import type { PaymentAccountDTO } from "@/lib/db/queries/ledger";
import { cn } from "@/lib/utils";

type IngestionItem = {
  id: string;
  sender: string;
  message: string;
  occurredAt: string;
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
    billTotalDue?: number;
    billDueDate?: string;
  };
};

const initialState: IntegrationActionState = { success: false };

function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }
  return (
    <Button type="button" variant="outline" size="sm" onClick={copy}>
      {copied ? <Check /> : <Clipboard />}
      {copied ? "Copied" : label}
    </Button>
  );
}

function SmsTokenPanel({ enabled, hint, webhookUrl }: { enabled: boolean; hint: string; webhookUrl: string }) {
  const [state, action, pending] = useActionState(generateSmsTokenAction, initialState);
  const curlExample = `POST ${webhookUrl}\nAuthorization: Bearer ${state.token ?? "YOUR_TOKEN"}\nContent-Type: application/json\n\n{"sender":"%SMSRF","message":"%SMSRB","timestamp":"%TIMES"}`;

  return (
    <Card className="border-none bg-gradient-to-br from-chart-1/10 via-card to-card ring-chart-1/20">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2"><RadioTower className="size-4 text-chart-1" /> Secure SMS webhook</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Your Android automation forwards only bank messages you choose.
            </p>
          </div>
          <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", enabled ? "bg-success/15 text-success" : "bg-muted text-muted-foreground")}>
            {enabled ? `Active · ${hint}` : "Not connected"}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl border border-border/70 bg-background/70 p-3">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Webhook URL</p>
          <div className="mt-2 flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate text-xs">{webhookUrl}</code>
            <CopyButton value={webhookUrl} />
          </div>
        </div>

        {state.token ? (
          <div className="rounded-xl border border-chart-2/30 bg-chart-2/10 p-3">
            <p className="text-xs font-medium uppercase tracking-wider text-chart-2">Copy this token now</p>
            <p className="mt-1 text-xs text-muted-foreground">For security, FinPlan stores only its fingerprint.</p>
            <div className="mt-3 flex items-center gap-2">
              <code className="min-w-0 flex-1 break-all text-xs">{state.token}</code>
              <CopyButton value={state.token} label="Token" />
            </div>
          </div>
        ) : null}

        {state.message ? <p className="text-sm text-success">{state.message}</p> : null}
        {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

        <div className="flex flex-wrap gap-2">
          <form action={action}>
            <Button type="submit" disabled={pending}>
              {enabled ? <RefreshCw /> : <KeyRound />}
              {pending ? "Generating…" : enabled ? "Rotate token" : "Generate token"}
            </Button>
          </form>
          {enabled ? (
            <form action={disableSmsIngestionAction}>
              <Button type="submit" variant="outline">Disable</Button>
            </form>
          ) : null}
        </div>

        <details className="group rounded-xl border border-border/70 bg-background/50 p-3">
          <summary className="cursor-pointer list-none text-sm font-medium">Android setup recipe</summary>
          <ol className="mt-3 space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground marker:text-foreground">
            <li>Install MacroDroid, Tasker, or Automate and create an “SMS received” trigger.</li>
            <li>Filter senders to your bank IDs (for example HDFCBK, AXISBK, ICICIB).</li>
            <li>Add an HTTP POST action using the webhook URL and token above.</li>
            <li>Send JSON with <code>sender</code>, <code>message</code>, and an optional <code>timestamp</code>.</li>
          </ol>
          <pre className="mt-3 overflow-x-auto rounded-lg bg-foreground/[0.04] p-3 text-[11px] leading-relaxed">{curlExample}</pre>
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
        <CardTitle className="flex items-center gap-2"><MessageSquareText className="size-4 text-chart-2" /> Test with a bank message</CardTitle>
        <p className="text-sm text-muted-foreground">Paste one real SMS to preview the same parser used by the webhook.</p>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-3">
          <Input name="sender" placeholder="Sender, e.g. AX-HDFCBK" />
          <Textarea name="message" required rows={5} className="min-h-28" placeholder="Your A/c XX1234 is debited by Rs. 450.00 via UPI to…" />
          {state.message ? <p className="text-sm text-success">{state.message}</p> : null}
          {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
          <Button type="submit" disabled={pending}>{pending ? "Reading message…" : "Parse and import"}</Button>
        </form>
      </CardContent>
    </Card>
  );
}

function MessageRow({ item, accounts }: { item: IngestionItem; accounts: PaymentAccountDTO[] }) {
  const needsReview = item.status === "needs_review";
  const amount = item.parsed.amount ?? item.parsed.billTotalDue;
  return (
    <article className={cn("rounded-xl border p-4", needsReview ? "border-chart-2/30 bg-chart-2/5" : "border-border bg-card")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{item.parsed.merchant || item.sender || (item.kind === "bill" ? "Credit card bill" : "Bank message")}</p>
            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide", item.status === "imported" ? "bg-success/15 text-success" : item.status === "needs_review" ? "bg-chart-2/15 text-chart-2" : "bg-muted text-muted-foreground")}>
              {item.status.replace("_", " ")}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{item.sender || "Unknown sender"} · {formatDate(item.occurredAt)}</p>
        </div>
        {amount !== undefined ? (
          <p className={cn("shrink-0 font-heading text-base font-semibold tabular-nums", item.parsed.type === "credit" ? "text-success" : "text-foreground")}>
            {item.parsed.type === "credit" ? "+" : item.parsed.type === "debit" ? "−" : ""}{formatINR(amount, { compact: true })}
          </p>
        ) : null}
      </div>
      <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{item.message}</p>

      {needsReview && (item.kind === "transaction" || item.kind === "bill") ? (
        <form action={approveMessageAction} className="mt-4 grid gap-2 border-t border-border/60 pt-3 sm:grid-cols-[1fr_1fr_auto]">
          <input type="hidden" name="eventId" value={item.id} />
          <select name="accountId" required defaultValue={item.accountId ?? ""} className="h-10 rounded-lg border border-input bg-background px-2.5 text-sm">
            <option value="" disabled>Choose account</option>
            {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}{account.lastFour ? ` · ${account.lastFour}` : ""}</option>)}
          </select>
          {item.kind === "bill" ? (
            <input type="hidden" name="category" value="Miscellaneous" />
          ) : (
            <select name="category" defaultValue={item.parsed.category ?? "Miscellaneous"} className="h-10 rounded-lg border border-input bg-background px-2.5 text-sm">
              {LEDGER_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
          )}
          <Button type="submit" className="h-10"><Check /> Approve</Button>
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

export function AutomationCenter({ settings, webhookUrl, ingestions, accounts }: {
  settings: { smsEnabled: boolean; smsTokenHint: string };
  webhookUrl: string;
  ingestions: IngestionItem[];
  accounts: PaymentAccountDTO[];
}) {
  const reviewCount = ingestions.filter((item) => item.status === "needs_review").length;
  return (
    <div className="space-y-8">
      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-success/20 bg-success/5 p-4">
          <ShieldCheck className="size-5 text-success" />
          <p className="mt-3 font-heading text-lg font-semibold">Private by design</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">No blanket inbox access. You decide which senders are forwarded.</p>
        </div>
        <div className="rounded-xl border border-chart-1/20 bg-chart-1/5 p-4">
          <Sparkles className="size-5 text-chart-1" />
          <p className="mt-3 font-heading text-lg font-semibold">{ingestions.filter((item) => item.status === "imported").length} auto-updated</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Transactions and card bills matched with high confidence.</p>
        </div>
        <div className="rounded-xl border border-chart-2/20 bg-chart-2/5 p-4">
          <MessageSquareText className="size-5 text-chart-2" />
          <p className="mt-3 font-heading text-lg font-semibold">{reviewCount} to review</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Ambiguous messages wait for you instead of changing balances.</p>
        </div>
      </section>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <SmsTokenPanel enabled={settings.smsEnabled} hint={settings.smsTokenHint} webhookUrl={webhookUrl} />
        <ManualMessageTest />
      </div>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="font-heading text-lg font-semibold">Message activity</h2>
            <p className="text-sm text-muted-foreground">Most recent messages, imports, and review decisions.</p>
          </div>
          <Link href="/transactions" className="text-sm font-medium text-primary hover:underline">Open ledger</Link>
        </div>
        {ingestions.length ? (
          <div className="space-y-2">{ingestions.map((item) => <MessageRow key={item.id} item={item} accounts={accounts} />)}</div>
        ) : (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No messages yet. Paste one above to test the flow.</div>
        )}
      </section>
    </div>
  );
}
