"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowUp, Bot, KeyRound, LoaderCircle, LockKeyhole, Sparkles, UserRound } from "lucide-react";
import {
  removeOpenAiKeyAction,
  saveOpenAiSettingsAction,
  type IntegrationActionState,
} from "@/actions/integrations";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";

type ChatMessage = { role: "user" | "assistant"; content: string };
const initialState: IntegrationActionState = { success: false };

function OpenAiSettings({ hasKey, keyHint, model }: { hasKey: boolean; keyHint: string; model: string }) {
  const [state, action, pending] = useActionState(saveOpenAiSettingsAction, initialState);
  return (
    <details open={!hasKey} className="rounded-xl border border-border bg-card">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4">
        <span className="flex items-center gap-2 font-medium"><KeyRound className="size-4 text-chart-2" /> OpenAI connection</span>
        <span className={cn("rounded-full px-2.5 py-1 text-xs", hasKey ? "bg-success/15 text-success" : "bg-chart-2/15 text-chart-2")}>
          {hasKey ? `Connected · •••${keyHint}` : "Setup needed"}
        </span>
      </summary>
      <div className="border-t border-border p-4">
        <form action={action} className="grid gap-3 sm:grid-cols-[1fr_12rem_auto]">
          <div>
            <label htmlFor="openai-key" className="mb-1.5 block text-xs font-medium text-muted-foreground">{hasKey ? "Replace API key" : "OpenAI API key"}</label>
            <Input id="openai-key" name="apiKey" type="password" autoComplete="off" required placeholder="sk-…" />
          </div>
          <div>
            <label htmlFor="openai-model" className="mb-1.5 block text-xs font-medium text-muted-foreground">Model</label>
            <select id="openai-model" name="model" defaultValue={model} className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm">
              <option value="gpt-5.4-mini">GPT-5.4 mini · efficient</option>
              <option value="gpt-5.4">GPT-5.4 · deeper analysis</option>
            </select>
          </div>
          <Button type="submit" disabled={pending} className="self-end">{pending ? "Saving…" : hasKey ? "Replace" : "Connect"}</Button>
        </form>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><LockKeyhole className="size-3.5" /> Encrypted at rest and used only on the server. When you ask, a finance snapshot without account numbers is sent to OpenAI with <code>store: false</code>.</p>
          {hasKey ? <form action={removeOpenAiKeyAction}><Button type="submit" variant="ghost" size="sm" className="text-destructive">Remove key</Button></form> : null}
        </div>
        {state.message ? <p className="mt-3 text-sm text-success">{state.message}</p> : null}
        {state.error ? <p className="mt-3 text-sm text-destructive">{state.error}</p> : null}
      </div>
    </details>
  );
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const assistant = message.role === "assistant";
  return (
    <div className={cn("flex gap-2.5", assistant ? "justify-start" : "justify-end")}>
      {assistant ? <span className="mt-1 flex size-7 shrink-0 items-center justify-center rounded-lg bg-chart-1/15 text-chart-1"><Bot className="size-4" /></span> : null}
      <div className={cn("max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed sm:max-w-[78%]", assistant ? "rounded-tl-md border border-border bg-card" : "rounded-tr-md bg-foreground text-background")}>
        {assistant ? (
          <div className="assistant-markdown space-y-2 [&_h2]:mt-3 [&_h2]:font-heading [&_h2]:text-base [&_h2]:font-semibold [&_h3]:mt-3 [&_h3]:font-semibold [&_li]:ml-4 [&_li]:list-disc [&_p]:leading-relaxed [&_strong]:font-semibold">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
          </div>
        ) : <p className="whitespace-pre-wrap">{message.content}</p>}
      </div>
      {!assistant ? <span className="mt-1 flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted"><UserRound className="size-4" /></span> : null}
    </div>
  );
}

export function FinanceAssistant({
  settings,
  summary,
}: {
  settings: { hasOpenAiKey: boolean; openAiKeyHint: string; openAiModel: string };
  summary: { liquidBalance: number; monthlySurplus: number; monthlyInvestments: number };
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [messages, loading]);

  const quickPrompts = [
    "Can I spend ₹50,000 next month without pausing my investments?",
    "Plan a ₹1.5 lakh trip six months from now.",
    "What is the largest safe purchase I can make this month?",
  ];

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading || !settings.hasOpenAiKey) return;
    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
    setMessages(nextMessages);
    setInput("");
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages.slice(-16) }),
      });
      const data = await response.json() as { message?: string; error?: string };
      if (!response.ok || !data.message) throw new Error(data.error || "No response received");
      setMessages((current) => [...current, { role: "assistant", content: data.message! }]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to reach the assistant");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="grid gap-3 sm:grid-cols-3">
        <Card size="sm" className="bg-chart-1/5 ring-chart-1/20"><CardContent><p className="text-xs text-muted-foreground">Liquid balance</p><p className="mt-1 font-heading text-xl font-semibold tabular-nums">{formatINR(summary.liquidBalance, { compact: true })}</p></CardContent></Card>
        <Card size="sm" className="bg-success/5 ring-success/20"><CardContent><p className="text-xs text-muted-foreground">Monthly surplus</p><p className="mt-1 font-heading text-xl font-semibold tabular-nums text-success">{formatINR(summary.monthlySurplus, { compact: true })}</p></CardContent></Card>
        <Card size="sm" className="bg-chart-2/5 ring-chart-2/20"><CardContent><p className="text-xs text-muted-foreground">Invested each month</p><p className="mt-1 font-heading text-xl font-semibold tabular-nums">{formatINR(summary.monthlyInvestments, { compact: true })}</p></CardContent></Card>
      </section>

      <OpenAiSettings hasKey={settings.hasOpenAiKey} keyHint={settings.openAiKeyHint} model={settings.openAiModel} />

      <Card className="min-h-[32rem] gap-0 py-0">
        <CardHeader className="border-b border-border py-4">
          <CardTitle className="flex items-center gap-2"><span className="flex size-8 items-center justify-center rounded-xl bg-chart-1/15"><Sparkles className="size-4 text-chart-1" /></span> Ask FinPlan</CardTitle>
          <p className="text-xs text-muted-foreground">Analysis is rebuilt from your latest FinPlan records for every answer.</p>
        </CardHeader>
        <CardContent className="flex min-h-[28rem] flex-1 flex-col px-0">
          <div className="flex-1 space-y-4 p-4 sm:p-5">
            {messages.length === 0 ? (
              <div className="mx-auto flex max-w-lg flex-col items-center py-10 text-center">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-chart-1/15"><Bot className="size-6 text-chart-1" /></span>
                <h2 className="mt-4 font-heading text-xl font-semibold">Plan with your real numbers</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Ask about a purchase, a trip, your cash buffer, or whether a goal clashes with your current investment schedule.</p>
                <div className="mt-5 flex flex-col gap-2">
                  {quickPrompts.map((prompt) => <button key={prompt} type="button" disabled={!settings.hasOpenAiKey} onClick={() => send(prompt)} className="rounded-xl border border-border bg-background px-4 py-2.5 text-left text-sm transition-colors hover:border-chart-1/40 hover:bg-chart-1/5 disabled:opacity-50">{prompt}</button>)}
                </div>
              </div>
            ) : messages.map((message, index) => <ChatBubble key={`${message.role}-${index}`} message={message} />)}
            {loading ? <div className="flex items-center gap-2.5 text-sm text-muted-foreground"><span className="flex size-7 items-center justify-center rounded-lg bg-chart-1/15"><LoaderCircle className="size-4 animate-spin text-chart-1" /></span> Checking balances, goals, and obligations…</div> : null}
            {error ? <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}
            <div ref={endRef} />
          </div>
          <div className="sticky bottom-0 border-t border-border bg-card p-3 sm:p-4">
            <form onSubmit={(event) => { event.preventDefault(); void send(input); }} className="flex items-end gap-2">
              <Textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void send(input); } }} disabled={!settings.hasOpenAiKey || loading} rows={2} className="max-h-36 min-h-12 resize-none" placeholder={settings.hasOpenAiKey ? "Ask about a purchase or future plan…" : "Connect OpenAI above to start"} />
              <Button type="submit" size="icon-lg" disabled={!settings.hasOpenAiKey || loading || !input.trim()} className="size-12 rounded-xl"><ArrowUp /><span className="sr-only">Send</span></Button>
            </form>
            <p className="mt-2 text-center text-[10px] text-muted-foreground">Review important decisions independently; balances are only as current as your FinPlan records.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
