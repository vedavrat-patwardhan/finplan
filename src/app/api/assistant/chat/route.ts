import OpenAI from "openai";
import { toResponseInputItems } from "openai/lib/responses/ResponseInputItems";
import { z } from "zod";
import mongoose from "mongoose";
import { requireSession } from "@/lib/auth/session";
import { connectDB } from "@/lib/db/mongoose";
import { IntegrationSetting, AssistantConversation } from "@/lib/db/models";
import { decryptSensitive } from "@/lib/crypto/sensitive";
import { buildFinanceAssistantContext } from "@/lib/ai/finance-context";
import { buildAssistantInstructions } from "@/lib/ai/prompt";
import { assistantTools, runAssistantTool } from "@/lib/ai/tools";
import {
  ASSISTANT_HISTORY_WINDOW,
  ASSISTANT_MAX_MESSAGE_CHARS,
  ASSISTANT_TITLE_MAX_CHARS,
  type AssistantChatResponse,
} from "@/lib/ai/assistant-types";

export const maxDuration = 120;

const ASSISTANT_MAX_ROUNDS = 6;

const requestSchema = z.object({
  conversationId: z.string().trim().min(1).optional(),
  message: z.string().trim().min(1).max(ASSISTANT_MAX_MESSAGE_CHARS),
});

/** Trims to the title cap, drops trailing punctuation, sentence-cases the first letter. */
function deriveTitle(message: string): string {
  const trimmed = message.trim().slice(0, ASSISTANT_TITLE_MAX_CHARS).trim();
  const withoutTrailingPunctuation = trimmed.replace(/[\s.,;:!?]+$/u, "");
  if (withoutTrailingPunctuation.length === 0) return "New chat";
  return withoutTrailingPunctuation.charAt(0).toUpperCase() + withoutTrailingPunctuation.slice(1);
}

function isFunctionCall(
  item: OpenAI.Responses.ResponseOutputItem
): item is OpenAI.Responses.ResponseFunctionToolCall {
  return item.type === "function_call";
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();

  let session;
  try {
    session = await requireSession();
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.username.trim().toLowerCase() !== "vedavrat") {
    return Response.json({ error: "Assistant access is not enabled for this account" }, { status: 403 });
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  }

  await connectDB();
  const integration = await IntegrationSetting.findOne({ userId: session.userId }).lean();
  if (!integration?.openAiApiKey) {
    return Response.json({ error: "Add your OpenAI API key before starting a conversation" }, { status: 409 });
  }

  const { conversationId, message } = parsed.data;

  let conversation;
  if (conversationId) {
    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return Response.json({ error: "Conversation not found" }, { status: 404 });
    }
    conversation = await AssistantConversation.findOne({
      _id: conversationId,
      userId: session.userId,
    });
    if (!conversation) {
      return Response.json({ error: "Conversation not found" }, { status: 404 });
    }
  } else {
    conversation = new AssistantConversation({
      userId: session.userId,
      title: deriveTitle(message),
      messages: [],
    });
  }

  const model = integration.openAiModel || "gpt-5.4-mini";

  try {
    const financeContext = await buildFinanceAssistantContext(session.userId);
    const instructions = buildAssistantInstructions(JSON.stringify(financeContext));
    const openai = new OpenAI({
      apiKey: decryptSensitive(integration.openAiApiKey),
      timeout: 90_000,
      maxRetries: 1,
    });

    const history = conversation.messages.slice(-ASSISTANT_HISTORY_WINDOW);
    const input: OpenAI.Responses.ResponseInputItem[] = [
      ...history.map((entry) => ({ role: entry.role, content: entry.content })),
      { role: "user" as const, content: message },
    ];

    const toolsUsed = new Set<string>();
    let finalMessage: string | null = null;
    let lastRequestId: string | undefined;

    for (let round = 0; round < ASSISTANT_MAX_ROUNDS; round++) {
      const response = await openai.responses.create({
        model,
        instructions,
        input,
        tools: assistantTools,
        tool_choice: "auto",
        parallel_tool_calls: true,
        reasoning: { effort: "medium" },
        include: ["reasoning.encrypted_content"],
        store: false,
        max_output_tokens: 3000,
      });
      lastRequestId = response._request_id ?? lastRequestId;

      const functionCalls = response.output.filter(isFunctionCall);
      if (functionCalls.length === 0) {
        finalMessage = response.output_text;
        break;
      }

      for (const call of functionCalls) toolsUsed.add(call.name);

      const outputs: OpenAI.Responses.ResponseInputItem.FunctionCallOutput[] = await Promise.all(
        functionCalls.map(async (call) => {
          const result = await runAssistantTool(session.userId, call.name, call.arguments);
          return {
            type: "function_call_output",
            call_id: call.call_id,
            output: JSON.stringify(result),
          };
        })
      );

      // `response.output` (function calls, and any reasoning items the model produced
      // while deciding to call them) must be replayed back verbatim so the next turn
      // sees its own tool-call turn intact. `toResponseInputItems` normalizes the
      // OpenAI SDK's `ResponseOutputItem[]` into `ResponseInputItem[]` (stripping
      // server-only fields like `created_by`) without dropping reasoning items —
      // required here since `store: false` means each reasoning item's
      // `encrypted_content` only survives by being resent in `input`.
      input.push(...toResponseInputItems(response.output), ...outputs);
    }

    if (finalMessage === null) {
      const finalResponse = await openai.responses.create({
        model,
        instructions,
        input,
        tools: assistantTools,
        tool_choice: "none",
        store: false,
        max_output_tokens: 3000,
      });
      lastRequestId = finalResponse._request_id ?? lastRequestId;
      finalMessage = finalResponse.output_text;
    }

    const toolsUsedList = [...toolsUsed];
    const now = new Date();
    conversation.messages.push({ role: "user", content: message, createdAt: now, toolsUsed: [] });
    conversation.messages.push({
      role: "assistant",
      content: finalMessage,
      createdAt: now,
      toolsUsed: toolsUsedList,
    });
    conversation.lastMessageAt = now;
    // `.model` collides with the Mongoose Document's own `model()` method, so the
    // schema field can't be assigned with dot notation — use `.set` instead.
    conversation.set("model", model);
    await conversation.save();

    const body: AssistantChatResponse = {
      conversationId: conversation._id.toString(),
      title: conversation.title,
      message: finalMessage,
      toolsUsed: toolsUsedList,
      asOf: financeContext.asOf,
      requestId: lastRequestId,
    };
    return Response.json(body);
  } catch (error) {
    console.error("Assistant chat request failed", { requestId, error });
    const message = error instanceof OpenAI.AuthenticationError
      ? "The saved OpenAI API key was rejected. Update it and try again."
      : error instanceof OpenAI.RateLimitError
        ? "OpenAI rate limit reached. Wait a moment and try again."
        : "The assistant could not complete this analysis. Please try again.";
    return Response.json({ error: message }, { status: 502 });
  }
}
