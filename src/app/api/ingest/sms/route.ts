import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authenticateIngestionRequest } from "@/lib/automation/ingestion-auth";
import { ingestFinanceMessage } from "@/lib/automation/message-ingestion";

const payloadSchema = z.object({
  sender: z.string().trim().max(80).default(""),
  message: z.string().trim().min(1).max(3000),
  timestamp: z.union([z.string(), z.number()]).optional(),
  source: z.enum(["sms", "notification", "history"]).optional(),
  historical: z.boolean().default(false),
});

function decodeLooseJsonString(value: string): string {
  return value
    .replace(/\\u([\da-f]{4})/gi, (_, code: string) =>
      String.fromCharCode(Number.parseInt(code, 16))
    )
    .replace(/\\(?:r\\n|n|r|t)/g, " ")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\")
    .replace(/[\u0000-\u001f]+/g, " ")
    .trim();
}

/**
 * MacroDroid can insert an SMS directly into a JSON template without escaping
 * line breaks or quotes. Recover the three known fields when that happens.
 */
function parseLooseMacroDroidJson(raw: string): Record<string, string> | undefined {
  const sender = raw.match(
    /["']sender["']\s*:\s*["']([\s\S]*?)["']\s*,\s*["']message["']\s*:/i
  )?.[1];
  const message = raw.match(
    /["']message["']\s*:\s*["']([\s\S]*?)["']\s*(?:,\s*["']timestamp["']\s*:|}\s*$)/i
  )?.[1];
  const timestampMatch = raw.match(
    /["']timestamp["']\s*:\s*(?:["']([\s\S]*?)["']|(-?\d+(?:\.\d+)?))\s*}\s*$/i
  );

  if (!message) return undefined;
  return {
    sender: sender ? decodeLooseJsonString(sender) : "",
    message: decodeLooseJsonString(message),
    ...(timestampMatch?.[1] || timestampMatch?.[2]
      ? { timestamp: decodeLooseJsonString(timestampMatch[1] ?? timestampMatch[2]) }
      : {}),
  };
}

async function readPayload(request: Request): Promise<unknown> {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";

  if (contentType.includes("multipart/form-data")) {
    return Object.fromEntries(await request.formData());
  }

  const raw = await request.text();
  if (contentType.includes("application/x-www-form-urlencoded")) {
    return Object.fromEntries(new URLSearchParams(raw));
  }

  try {
    return JSON.parse(raw);
  } catch {
    return parseLooseMacroDroidJson(raw);
  }
}

function parseTimestamp(value: string | number | undefined): Date | undefined {
  if (value === undefined) return undefined;
  const numeric = typeof value === "number" ? value : /^\d+$/.test(value) ? Number(value) : NaN;
  if (Number.isFinite(numeric)) {
    return new Date(numeric < 1_000_000_000_000 ? numeric * 1000 : numeric);
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export async function POST(request: Request) {
  const integration = await authenticateIngestionRequest(request);
  if (!integration) {
    return Response.json({ error: "Invalid ingestion token" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await readPayload(request);
  } catch {
    return Response.json({ error: "Could not read the request body" }, { status: 400 });
  }
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      {
        error:
          parsed.error.issues[0]?.message ??
          "Send a JSON or form request with sender, message, and optional timestamp fields",
      },
      { status: 400 }
    );
  }

  const occurredAt = parseTimestamp(parsed.data.timestamp);
  try {
    const result = await ingestFinanceMessage({
      userId: integration.userId,
      sender: parsed.data.sender,
      message: parsed.data.message,
      occurredAt,
      historical: parsed.data.historical,
    });
    if (result.status !== "duplicate") {
      revalidatePath("/automations");
      revalidatePath("/dashboard");
      revalidatePath("/transactions");
      revalidatePath("/accounts");
    }
    const status =
      result.status === "duplicate" ? 200 : result.status === "needs_review" ? 202 : 201;
    return Response.json(result, { status });
  } catch (error) {
    console.error("SMS ingestion failed", error);
    return Response.json({ error: "Unable to process this message" }, { status: 500 });
  }
}
