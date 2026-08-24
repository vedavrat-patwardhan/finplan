import { cache } from "react";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import { IntegrationSetting, MessageIngestion } from "@/lib/db/models";
import { decryptSensitive } from "@/lib/crypto/sensitive";

export const getIntegrationSettings = cache(async (userId: string) => {
  await connectDB();
  const item = await IntegrationSetting.findOne({ userId: new mongoose.Types.ObjectId(userId) }).lean();
  return {
    hasOpenAiKey: Boolean(item?.openAiApiKey),
    openAiKeyHint: item?.openAiKeyHint ?? "",
    openAiModel: item?.openAiModel ?? "gpt-5.4-mini",
    smsEnabled: item?.smsEnabled ?? false,
    smsTokenHint: item?.smsTokenHint ?? "",
  };
});

export const getMessageIngestions = cache(async (userId: string, limit = 30) => {
  await connectDB();
  const items = await MessageIngestion.find({ userId: new mongoose.Types.ObjectId(userId) })
    .sort({ occurredAt: -1 })
    .limit(limit)
    .lean();

  return items.map((item) => ({
    id: item._id.toString(),
    sender: item.sender,
    message: decryptSensitive(item.encryptedMessage),
    occurredAt: item.occurredAt.toISOString(),
    historical: item.historical ?? false,
    kind: item.kind,
    status: item.status,
    confidence: item.confidence,
    accountId: item.accountId?.toString(),
    transactionId: item.transactionId?.toString(),
    parsed: {
      type: item.parsed?.type ?? undefined,
      amount: item.parsed?.amount ?? undefined,
      category: item.parsed?.category ?? undefined,
      merchant: item.parsed?.merchant ?? "",
      accountLastFour: item.parsed?.accountLastFour ?? "",
      availableBalance: item.parsed?.availableBalance ?? undefined,
      billTotalDue: item.parsed?.billTotalDue ?? undefined,
      billDueDate: item.parsed?.billDueDate?.toISOString(),
    },
  }));
});
