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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";

type ChatMessage = { role: "user" | "assistant"; content: string };
const initialState: IntegrationActionState = { success: false };

const QUICK_PROMPTS = [
  "Can I spend ₹50,000 next month without pausing my investments?",
  "Plan a ₹1.5 lakh trip six months from now.",
  "What is the largest safe purchase I can make this month?",
];

function OpenAiSettings({ hasKey, keyHint, model }: { hasKey: boolean; keyHint: string; model: string }) {
  const [state, action, pending] = useActionState(saveOpenAiSettingsAction, initialState);
  return (
    <details open={!hasKey} className="border border-border bg-card">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4">
        <span className="flex items-center gap-2 text-sm font-bold"><KeyRound className="size-4 text-brand-text" /> OpenAI connection</span>
        <Badge variant={hasKey ? "success" : "warning"}>
          {hasKey ? `Connected · •••${keyHint}` : "Setup needed"}
        </Badge>
      </summary>
      <div className="border-t border-border p-4">
        <form action={action} className="grid gap-3 sm:grid-cols-[1fr_12rem_auto]">
          <div>
            <Label htmlFor="openai-key">{hasKey ? "Replace API key" : "OpenAI API key"}</Label>
            <Input id="openai-key" name="apiKey" type="password" autoComplete="off" required placeholder="sk-…" className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="openai-model">Model</Label>
            <Select name="model" defaultValue={model}>
              <SelectTrigger id="openai-model" className="mt-1.5 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gpt-5.4-mini">GPT-5.4 mini · efficient</SelectItem>
                <SelectItem value="gpt-5.4">GPT-5.4 · deeper analysis</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={pending} className="self-end">{pending ? "Saving…" : hasKey ? "Replace" : "Connect"}</Button>
        </form>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <LockKeyhole className="size-3.5" /> Encrypted at rest and used only on the server. When you ask, a finance snapshot without account numbers is sent to OpenAI with <code className="bg-muted px-1 font-mono">store: false</code>.
          </p>
          {hasKey ? (
            <form action={removeOpenAiKeyAction}>
              <Button type="submit" variant="ghost" size="sm" className="text-destructive">Remove key</Button>
            </form>
          ) : null}
        </div>
        {state.message ? <p className="mt-3 text-sm text-success-text">{state.message}</p> : null}
        {state.error ? <p className="mt-3 text-sm text-destructive">{state.error}</p> : null}
      </div>
    </details>
  );
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const assistant = message.role === "assistant";
  return (
    <div className={cn("flex gap-2.5", assistant ? "justify-start" : "justify-end")}>
      {assistant ? (
        <span className="mt-1 flex size-8 shrink-0 items-center justify-center bg-brand text-brand-foreground">
          <Bot className="size-4" />
        </span>
      ) : null}
      <div
        className={cn(
          "max-w-[85%] px-4 py-3 text-sm leading-relaxed",
          assistant ? "border border-border bg-card" : "bg-primary text-primary-foreground"
        )}
      >
        {assistant ? (
          <div className="assistant-markdown space-y-2 [&_code]:bg-muted [&_code]:px-1 [&_code]:font-mono [&_h2]:mt-3 [&_h2]:text-base [&_h2]:font-bold [&_h3]:mt-3 [&_h3]:font-bold [&_li]:ml-4 [&_li]:list-disc [&_p]:leading-relaxed [&_strong]:font-bold [&_table]:w-full [&_table]:border [&_table]:border-border [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-border [&_th]:px-2 [&_th]:py-1 [&_th]:np-caps [&_th]:text-muted-foreground">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
          </div>
        ) : <p className="whitespace-pre-wrap">{message.content}</p>}
      </div>
      {!assistant ? (
        <span className="mt-1 flex size-8 shrink-0 items-center justify-center bg-muted">
          <UserRound className="size-4" />
        </span>
      ) : null}
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
        <Card size="sm">
          <CardContent>
            <p className="np-caps text-muted-foreground">Liquid balance</p>
            <p className="mt-1 text-xl font-extrabold tabular-nums">{formatINR(summary.liquidBalance, { compact: true })}</p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent>
            <p className="np-caps text-muted-foreground">Monthly surplus</p>
            <p className="mt-1 text-xl font-extrabold tabular-nums text-success-text">{formatINR(summary.monthlySurplus, { compact: true })}</p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent>
            <p className="np-caps text-muted-foreground">Invested each month</p>
            <p className="mt-1 text-xl font-extrabold tabular-nums">{formatINR(summary.monthlyInvestments, { compact: true })}</p>
          </CardContent>
        </Card>
      </section>

      <OpenAiSettings hasKey={settings.hasOpenAiKey} keyHint={settings.openAiKeyHint} model={settings.openAiModel} />

      <Card className="min-h-[32rem] gap-0 py-0">
        <CardHeader className="border-b border-border py-4">
          <CardTitle className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center bg-brand text-brand-foreground"><Sparkles className="size-4" /></span> Ask FinPlan
          </CardTitle>
          <p className="text-xs text-muted-foreground">Analysis is rebuilt from your latest FinPlan records for every answer.</p>
        </CardHeader>
        <CardContent className="flex min-h-[28rem] flex-1 flex-col px-0">
          <div className="flex-1 space-y-4 p-4 sm:p-5">
            {messages.length === 0 ? (
              <div className="mx-auto flex max-w-lg flex-col items-center py-10 text-center">
                <span className="flex size-12 items-center justify-center bg-brand text-brand-foreground"><Bot className="size-6" /></span>
                <p className="np-kicker np-caps mt-4 text-xs text-subtle">ask finplan</p>
                <h2 className="mt-2 font-display text-3xl leading-tight">plan with your real numbers</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Ask about a purchase, a trip, your cash buffer, or whether a goal clashes with your current investment schedule.</p>
                <div className="mt-5 flex w-full flex-col gap-2">
                  {QUICK_PROMPTS.map((prompt) => (
                    <Button
                      key={prompt}
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!settings.hasOpenAiKey}
                      onClick={() => send(prompt)}
                      className="h-auto w-full shrink whitespace-normal py-2 text-left text-xs font-medium normal-case tracking-normal"
                    >
                      {prompt}
                    </Button>
                  ))}
                </div>
              </div>
            ) : messages.map((message, index) => <ChatBubble key={`${message.role}-${index}`} message={message} />)}
            {loading ? (
              <div className="flex items-center gap-2.5">
                <span className="flex size-8 shrink-0 items-center justify-center bg-brand text-brand-foreground">
                  <LoaderCircle className="size-4 animate-spin" />
                </span>
                <span className="np-caps text-muted-foreground">thinking</span>
              </div>
            ) : null}
            {error ? <p className="border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}
            <div ref={endRef} />
          </div>
          <div className="sticky bottom-0 border-t border-border bg-card p-3 sm:p-4">
            <form onSubmit={(event) => { event.preventDefault(); void send(input); }} className="flex items-end gap-2">
              <Textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void send(input); } }}
                disabled={!settings.hasOpenAiKey || loading}
                rows={2}
                className="max-h-36 min-h-12 resize-none"
                placeholder={settings.hasOpenAiKey ? "Ask about a purchase or future plan…" : "Connect OpenAI above to start"}
              />
              <Button type="submit" variant="brand" size="icon" disabled={!settings.hasOpenAiKey || loading || !input.trim()}>
                <ArrowUp />
                <span className="sr-only">Send</span>
              </Button>
            </form>
            <p className="mt-2 text-center text-[10px] text-muted-foreground">Review important decisions independently; balances are only as current as your FinPlan records.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
