import { createHash, timingSafeEqual } from "crypto";
import { z } from "zod";
import { connectDB } from "@/lib/db/mongoose";
import { IntegrationSetting } from "@/lib/db/models";
import { ingestFinanceMessage } from "@/lib/automation/message-ingestion";

const payloadSchema = z.object({
  sender: z.string().trim().max(80).default(""),
  message: z.string().trim().min(1).max(3000),
  timestamp: z.union([z.string(), z.number()]).optional(),
});

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function secureHashMatch(actual: string, expected: string) {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
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
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ")
    ? authorization.slice(7).trim()
    : request.headers.get("x-finplan-token")?.trim() ?? "";
  if (!token || token.length < 24) {
    return Response.json({ error: "Invalid ingestion token" }, { status: 401 });
  }

  await connectDB();
  const hash = tokenHash(token);
  const integration = await IntegrationSetting.findOne({ smsEnabled: true, smsTokenHash: hash }).lean();
  if (!integration || !secureHashMatch(hash, integration.smsTokenHash)) {
    return Response.json({ error: "Invalid ingestion token" }, { status: 401 });
  }

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

  const occurredAt = parseTimestamp(parsed.data.timestamp);
  try {
    const result = await ingestFinanceMessage({
      userId: integration.userId.toString(),
      sender: parsed.data.sender,
      message: parsed.data.message,
      occurredAt,
    });
    return Response.json(result, { status: result.status === "duplicate" ? 200 : 201 });
  } catch (error) {
    console.error("SMS ingestion failed", error);
    return Response.json({ error: "Unable to process this message" }, { status: 500 });
  }
}
