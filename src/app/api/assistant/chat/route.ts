import OpenAI from "openai";
import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { connectDB } from "@/lib/db/mongoose";
import { IntegrationSetting } from "@/lib/db/models";
import { decryptSensitive } from "@/lib/crypto/sensitive";
import { buildFinanceAssistantContext } from "@/lib/ai/finance-context";

const requestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(6000),
      })
    )
    .min(1)
    .max(16),
});

const INSTRUCTIONS = `You are Vedavrat's private finance planning assistant inside FinPlan.
Use only the supplied finance snapshot for personal financial facts. Do arithmetic carefully and use Indian rupees and Indian number formatting.

For affordability questions, explicitly evaluate:
1. liquid cash today after near-term dues;
2. a minimum cash buffer of at least three months of essential expenses;
3. monthly surplus and the savings required by the requested date;
4. effect on scheduled investments, insurance, liabilities, and existing goal contributions.

Never count a credit limit as available money. Do not treat an investment as liquid cash unless you clearly label it as a possible liquidation and state that taxes, exit loads, lock-ins, and current market value may be unknown. Never invent live balances, returns, market prices, or missing dates. If records are incomplete or stale, say exactly which assumption affects the answer.

Lead with a clear verdict: "Yes", "Not yet", or "Yes, with conditions". Then show the decisive numbers and a practical plan. Prefer concise Markdown with headings and bullets. This is planning guidance, not a guarantee or regulated financial advice.`;

export async function POST(request: Request) {
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

  try {
    const financeContext = await buildFinanceAssistantContext(session.userId);
    const openai = new OpenAI({ apiKey: decryptSensitive(integration.openAiApiKey) });
    const response = await openai.responses.create({
      model: integration.openAiModel || "gpt-5.4-mini",
      instructions: `${INSTRUCTIONS}\n\nCURRENT FINPLAN SNAPSHOT (authoritative application data):\n${JSON.stringify(financeContext)}`,
      input: parsed.data.messages,
      reasoning: { effort: "low" },
      max_output_tokens: 1400,
      store: false,
    });

    return Response.json({
      message: response.output_text,
      requestId: response._request_id,
      asOf: financeContext.asOf,
    });
  } catch (error) {
    console.error("Finance assistant request failed", error);
    const message = error instanceof OpenAI.AuthenticationError
      ? "The saved OpenAI API key was rejected. Update it and try again."
      : error instanceof OpenAI.RateLimitError
        ? "OpenAI rate limit reached. Wait a moment and try again."
        : "The assistant could not complete this analysis. Please try again.";
    return Response.json({ error: message }, { status: 502 });
  }
}
