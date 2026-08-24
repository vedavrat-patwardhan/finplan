import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { ingestFinanceMessage } from "@/lib/automation/message-ingestion";

const messageSchema = z.object({
  sender: z.string().trim().max(80).default(""),
  message: z.string().trim().min(1).max(3000),
  timestamp: z.union([z.string(), z.number()]),
});

const payloadSchema = z.object({
  messages: z.array(messageSchema).min(1).max(25),
});

function parseTimestamp(value: string | number): Date | undefined {
  const numeric = typeof value === "number" ? value : /^\d+$/.test(value) ? Number(value) : NaN;
  if (Number.isFinite(numeric)) {
    const date = new Date(numeric < 1_000_000_000_000 ? numeric * 1000 : numeric);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Expected a JSON request body" }, { status: 400 });
  }

  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const totals = { imported: 0, needsReview: 0, duplicates: 0, failed: 0 };
  const orderedMessages = parsed.data.messages.toSorted(
    (left, right) => Number(left.timestamp) - Number(right.timestamp)
  );

  for (const item of orderedMessages) {
    try {
      const result = await ingestFinanceMessage({
        userId: session.userId,
        sender: item.sender,
        message: item.message,
        occurredAt: parseTimestamp(item.timestamp),
        historical: true,
      });
      if (result.status === "imported") totals.imported += 1;
      else if (result.status === "duplicate") totals.duplicates += 1;
      else totals.needsReview += 1;
    } catch (error) {
      console.error("Historical SMS ingestion failed", error);
      totals.failed += 1;
    }
  }

  return Response.json(totals);
}
