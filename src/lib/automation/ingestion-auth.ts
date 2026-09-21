import "server-only";

import { createHash, timingSafeEqual } from "crypto";
import { connectDB } from "@/lib/db/mongoose";
import { IntegrationSetting } from "@/lib/db/models";

export async function authenticateIngestionRequest(
  request: Request
): Promise<{ userId: string } | null> {
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ")
    ? authorization.slice(7).trim()
    : request.headers.get("x-finplan-token")?.trim() ?? "";
  if (!token || token.length < 24) return null;

  await connectDB();
  const hash = createHash("sha256").update(token).digest("hex");
  const integration = await IntegrationSetting.findOne({
    smsEnabled: true,
    smsTokenHash: hash,
  }).lean();
  if (!integration?.smsTokenHash) return null;

  const actual = Buffer.from(hash);
  const expected = Buffer.from(integration.smsTokenHash);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return null;
  }

  return { userId: integration.userId.toString() };
}
