"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import {
  ArrowUp,
  Bot,
  History as HistoryIcon,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  UserRound,
} from "lucide-react";
import {
  removeOpenAiKeyAction,
  saveOpenAiSettingsAction,
  type IntegrationActionState,
} from "@/actions/integrations";
import {
  deleteConversationAction,
  getConversationAction,
  renameConversationAction,
} from "@/actions/assistant";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { formatDate, formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";
import type {
  AssistantChatError,
  AssistantChatResponse,
  AssistantMessageDTO,
  ConversationSummaryDTO,
} from "@/lib/ai/assistant-types";

const initialState: IntegrationActionState = { success: false };

const QUICK_PROMPTS = [
  "What did I spend on food last month?",
  "Show my categorized expenses for last month",
  "Which merchants did I pay the most this month?",
  "Am I over budget in any category this month?",
  "Can I afford a ₹1.5 lakh trip in December?",
];

function relativeDay(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const startOfDay = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
  const diffDays = Math.round((startOfDay(new Date()) - startOfDay(date)) / (24 * 60 * 60 * 1000));
  if (diffDays <= 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return formatDate(date);
}

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

function ChatBubble({ message }: { message: AssistantMessageDTO }) {
  const assistant = message.role === "assistant";
  return (
    <div className={cn("flex flex-col gap-1", assistant ? "items-start" : "items-end")}>
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
          ) : (
            <p className="whitespace-pre-wrap">{message.content}</p>
          )}
        </div>
        {!assistant ? (
          <span className="mt-1 flex size-8 shrink-0 items-center justify-center bg-muted">
            <UserRound className="size-4" />
          </span>
        ) : null}
      </div>
      {assistant && message.toolsUsed?.length ? (
        <p className="np-caps pl-[42px] text-[9px] text-faint">via {message.toolsUsed.join(" · ")}</p>
      ) : null}
    </div>
  );
}

export function FinanceAssistant({
  settings,
  summary,
  initialConversations,
}: {
  settings: { hasOpenAiKey: boolean; openAiKeyHint: string; openAiModel: string };
  summary: { liquidBalance: number; monthlySurplus: number; monthlyInvestments: number };
  initialConversations: ConversationSummaryDTO[];
}) {
  const [conversations, setConversations] = useState<ConversationSummaryDTO[]>(initialConversations);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AssistantMessageDTO[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationLoading, setConversationLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastFailedText, setLastFailedText] = useState<string | null>(null);
  const [historySheetOpen, setHistorySheetOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ConversationSummaryDTO | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, loading, conversationLoading]);

  function startNewChat() {
    setActiveId(null);
    setMessages([]);
    setError("");
    setLastFailedText(null);
    setHistorySheetOpen(false);
  }

  async function selectConversation(id: string) {
    setHistorySheetOpen(false);
    if (id === activeId) return;
    setActiveId(id);
    setError("");
    setLastFailedText(null);
    setConversationLoading(true);
    try {
      const conversation = await getConversationAction(id);
      setMessages(conversation?.messages ?? []);
    } catch {
      setError("Could not load this chat");
      setMessages([]);
    } finally {
      setConversationLoading(false);
    }
  }

  async function doSend(text: string, opts: { skipOptimistic?: boolean } = {}) {
    const trimmed = text.trim();
    if (!trimmed || loading || !settings.hasOpenAiKey) return;

    const priorCount = messages.length + (opts.skipOptimistic ? 0 : 1);
    if (!opts.skipOptimistic) {
      setMessages((current) => [...current, { role: "user", content: trimmed, createdAt: new Date().toISOString() }]);
      setInput("");
    }
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: activeId ?? undefined, message: trimmed }),
      });
      const data = (await response.json()) as Partial<AssistantChatResponse & AssistantChatError>;
      if (!response.ok || !data.message || !data.conversationId) {
        throw new Error(data.error || "No response received");
      }

      const conversationId = data.conversationId;
      const replyText = data.message;
      const title = data.title ?? "New chat";
      const toolsUsed = data.toolsUsed?.length ? data.toolsUsed : undefined;

      setActiveId(conversationId);
      setMessages((current) => [
        ...current,
        { role: "assistant", content: replyText, createdAt: new Date().toISOString(), toolsUsed },
      ]);
      setLastFailedText(null);

      setConversations((current) => {
        const next = current.filter((item) => item.id !== conversationId);
        next.unshift({
          id: conversationId,
          title,
          updatedAt: new Date().toISOString(),
          messageCount: priorCount + 1,
          preview: replyText.slice(0, 80),
        });
        return next;
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to reach the assistant");
      setLastFailedText(trimmed);
    } finally {
      setLoading(false);
    }
  }

  function send(text: string) {
    void doSend(text);
  }

  function retry() {
    if (lastFailedText) void doSend(lastFailedText, { skipOptimistic: true });
  }

  function startRename(item: ConversationSummaryDTO) {
    setRenamingId(item.id);
    setRenameValue(item.title);
  }

  async function commitRename(id: string) {
    const title = renameValue.trim();
    setRenamingId(null);
    const existing = conversations.find((item) => item.id === id);
    if (!existing || !title || existing.title === title) return;

    setConversations((current) => current.map((item) => (item.id === id ? { ...item, title } : item)));
    const result = await renameConversationAction(id, title);
    if (!result.success) {
      toast.error(result.error ?? "Could not rename chat");
      setConversations((current) => current.map((item) => (item.id === id ? { ...item, title: existing.title } : item)));
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeletePending(true);
    const result = await deleteConversationAction(deleteTarget.id);
    setDeletePending(false);
    if (!result.success) {
      toast.error(result.error ?? "Could not delete chat");
      return;
    }
    setConversations((current) => current.filter((item) => item.id !== deleteTarget.id));
    if (activeId === deleteTarget.id) {
      setActiveId(null);
      setMessages([]);
    }
    toast.success("Chat deleted");
    setDeleteTarget(null);
  }

  function renderHistoryList() {
    if (conversations.length === 0) {
      return <p className="p-4 text-sm text-muted-foreground">No chats yet. Ask something to start one.</p>;
    }
    return (
      <div className="flex flex-col">
        {conversations.map((item) => {
          const isActive = item.id === activeId;
          const isRenaming = renamingId === item.id;
          return (
            <div
              key={item.id}
              role="button"
              tabIndex={0}
              onClick={() => void selectConversation(item.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  void selectConversation(item.id);
                }
              }}
              className={cn(
                "group relative w-full cursor-pointer border-l-[3px] px-4 py-3 text-left hover:bg-accent",
                isActive ? "border-brand bg-accent" : "border-transparent"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                {isRenaming ? (
                  <Input
                    autoFocus
                    value={renameValue}
                    onClick={(event) => event.stopPropagation()}
                    onChange={(event) => setRenameValue(event.target.value)}
                    onKeyDown={(event) => {
                      event.stopPropagation();
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void commitRename(item.id);
                      }
                      if (event.key === "Escape") {
                        event.preventDefault();
                        setRenamingId(null);
                      }
                    }}
                    onBlur={() => void commitRename(item.id)}
                    className="h-7 flex-1 text-sm"
                  />
                ) : (
                  <p
                    className="min-w-0 flex-1 truncate text-sm font-semibold"
                    onDoubleClick={(event) => {
                      event.stopPropagation();
                      startRename(item);
                    }}
                  >
                    {item.title}
                  </p>
                )}
                {!isRenaming ? (
                  <div className="flex shrink-0 items-center gap-0.5 opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 max-lg:opacity-100">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      aria-label={`Rename ${item.title}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        startRename(item);
                      }}
                    >
                      <Pencil />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      className="text-muted-foreground hover:text-destructive"
                      aria-label={`Delete ${item.title}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        setDeleteTarget(item);
                      }}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                ) : null}
              </div>
              <p className="np-caps mt-1 text-[9px] text-faint">
                {relativeDay(item.updatedAt)} · {item.messageCount} msg{item.messageCount === 1 ? "" : "s"}
              </p>
              {item.preview ? (
                <p className="mt-1 text-xs text-muted-foreground line-clamp-1">{item.preview}</p>
              ) : null}
            </div>
          );
        })}
      </div>
    );
  }

  const activeTitle = (activeId && conversations.find((item) => item.id === activeId)?.title) || "Ask FinPlan";

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

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <aside className="hidden w-72 shrink-0 flex-col border border-border bg-card lg:flex">
          <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
            <span className="np-caps text-muted-foreground">history</span>
            <Button type="button" variant="brand" size="sm" onClick={startNewChat}>
              <Plus /> New chat
            </Button>
          </div>
          <div className="max-h-[36rem] flex-1 overflow-y-auto">{renderHistoryList()}</div>
        </aside>

        <Card className="min-h-[32rem] flex-1 min-w-0 gap-0 py-0">
          <CardHeader className="flex-row items-center justify-between gap-3 border-b border-border py-4">
            <div className="min-w-0">
              <CardTitle className="flex items-center gap-2">
                <span className="flex size-8 shrink-0 items-center justify-center bg-brand text-brand-foreground"><Sparkles className="size-4" /></span>
                <span className="truncate">{activeTitle}</span>
              </CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">Analysis is rebuilt from your latest FinPlan records for every answer.</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 lg:hidden"
              onClick={() => setHistorySheetOpen(true)}
            >
              <HistoryIcon /> History ({conversations.length})
            </Button>
          </CardHeader>
          <CardContent className="flex min-h-[28rem] flex-1 flex-col px-0">
            <div className="flex-1 space-y-4 p-4 sm:p-5">
              {conversationLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-16 w-3/4" />
                  <Skeleton className="ml-auto h-10 w-1/2" />
                  <Skeleton className="h-20 w-4/5" />
                </div>
              ) : messages.length === 0 ? (
                <div className="mx-auto flex max-w-lg flex-col items-center py-10 text-center">
                  <span className="flex size-12 items-center justify-center bg-brand text-brand-foreground"><Bot className="size-6" /></span>
                  <p className="np-kicker np-caps mt-4 text-xs text-subtle">ask finplan</p>
                  <h2 className="mt-2 font-display text-3xl leading-tight">plan with your real numbers</h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Ask about spending, budgets, dues, or whether a plan is affordable — answered from your real FinPlan ledger.</p>
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
              ) : (
                messages.map((message, index) => (
                  <ChatBubble key={`${message.role}-${index}-${message.createdAt}`} message={message} />
                ))
              )}
              {loading ? (
                <div className="flex items-center gap-2.5">
                  <span className="flex size-8 shrink-0 items-center justify-center bg-brand text-brand-foreground">
                    <LoaderCircle className="size-4 animate-spin" />
                  </span>
                  <span className="np-caps text-muted-foreground">thinking</span>
                </div>
              ) : null}
              {error ? (
                <div className="flex flex-wrap items-center justify-between gap-2 border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  <span>{error}</span>
                  {lastFailedText ? (
                    <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={retry} disabled={loading}>
                      Retry
                    </Button>
                  ) : null}
                </div>
              ) : null}
              <div ref={endRef} />
            </div>
            <div className="sticky bottom-0 border-t border-border bg-card p-3 sm:p-4">
              <form onSubmit={(event) => { event.preventDefault(); send(input); }} className="flex items-end gap-2">
                <Textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); send(input); } }}
                  disabled={!settings.hasOpenAiKey || loading}
                  rows={2}
                  className="max-h-36 min-h-12 resize-none"
                  placeholder={settings.hasOpenAiKey ? "Ask about spending, budgets, or a future plan…" : "Connect OpenAI above to start"}
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

      <Sheet open={historySheetOpen} onOpenChange={setHistorySheetOpen}>
        <SheetContent side="left" className="flex w-3/4 flex-col gap-0 p-0 sm:max-w-sm">
          <SheetTitle className="sr-only">Chat history</SheetTitle>
          <div className="flex items-center justify-between gap-2 border-b border-border py-3 pr-12 pl-4">
            <span className="np-caps text-muted-foreground">history</span>
            <Button type="button" variant="brand" size="sm" onClick={startNewChat}>
              <Plus /> New chat
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto">{renderHistoryList()}</div>
        </SheetContent>
      </Sheet>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete this chat?</DialogTitle>
            <DialogDescription>
              {deleteTarget ? `“${deleteTarget.title}” will be permanently removed.` : "This chat will be permanently removed."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="ghost" onClick={() => setDeleteTarget(null)} disabled={deletePending}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={confirmDelete} disabled={deletePending}>
              {deletePending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
