"use server";

import { createHash, randomBytes } from "crypto";
import mongoose from "mongoose";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { connectDB } from "@/lib/db/mongoose";
import {
  IntegrationSetting,
  LedgerTransaction,
  MessageIngestion,
  PaymentAccount,
} from "@/lib/db/models";
import { encryptSensitive } from "@/lib/crypto/sensitive";
import { ingestFinanceMessage } from "@/lib/automation/message-ingestion";
import { reconcileAccountsFromMessageHistory } from "@/lib/automation/history-reconciliation";
import { transactionBalanceDelta } from "@/lib/finance/ledger";
import { type PaymentAccountType } from "@/lib/finance/constants";
import {
  getAllowedLedgerCategoryNames,
  resolveAllowedLedgerCategory,
} from "@/lib/finance/ledger-categories";

export interface IntegrationActionState {
  success: boolean;
  error?: string;
  message?: string;
  token?: string;
}

const modelSchema = z.enum(["gpt-5.4-mini", "gpt-5.4"]);

function oid(value: string) {
  return new mongoose.Types.ObjectId(value);
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function isVedavrat(username: string) {
  return username.trim().toLowerCase() === "vedavrat";
}

function refreshAutomationPages() {
  revalidatePath("/automations");
  revalidatePath("/dashboard");
  revalidatePath("/transactions");
  revalidatePath("/accounts");
}

export async function saveOpenAiSettingsAction(
  _previous: IntegrationActionState,
  formData: FormData
): Promise<IntegrationActionState> {
  void _previous;
  const session = await requireSession();
  if (!isVedavrat(session.username)) return { success: false, error: "This integration is not enabled for your account." };

  const parsed = z
    .object({ apiKey: z.string().trim().min(20, "Enter a valid API key"), model: modelSchema })
    .safeParse({ apiKey: formData.get("apiKey"), model: formData.get("model") });
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message };

  await connectDB();
  await IntegrationSetting.findOneAndUpdate(
    { userId: oid(session.userId) },
    {
      $set: {
        openAiApiKey: encryptSensitive(parsed.data.apiKey),
        openAiKeyHint: parsed.data.apiKey.slice(-6),
        openAiModel: parsed.data.model,
      },
    },
    { upsert: true }
  );
  revalidatePath("/assistant");
  return { success: true, message: "OpenAI connection saved securely." };
}

export async function removeOpenAiKeyAction(): Promise<void> {
  const session = await requireSession();
  if (!isVedavrat(session.username)) return;
  await connectDB();
  await IntegrationSetting.updateOne(
    { userId: oid(session.userId) },
    { $set: { openAiApiKey: "", openAiKeyHint: "" } }
  );
  revalidatePath("/assistant");
}

export async function generateSmsTokenAction(
  _previous: IntegrationActionState,
  _formData: FormData
): Promise<IntegrationActionState> {
  void _previous;
  void _formData;
  const session = await requireSession();
  const token = `fp_sms_${randomBytes(32).toString("base64url")}`;
  await connectDB();
  await IntegrationSetting.findOneAndUpdate(
    { userId: oid(session.userId) },
    {
      $set: {
        smsTokenHash: hashToken(token),
        smsTokenHint: token.slice(-6),
        smsEnabled: true,
      },
    },
    { upsert: true }
  );
  refreshAutomationPages();
  return {
    success: true,
    token,
    message: "Token generated. Copy it now — it will not be shown again.",
  };
}

export async function disableSmsIngestionAction(): Promise<void> {
  const session = await requireSession();
  await connectDB();
  await IntegrationSetting.updateOne(
    { userId: oid(session.userId) },
    { $set: { smsEnabled: false, smsTokenHash: "", smsTokenHint: "" } }
  );
  refreshAutomationPages();
}

export async function ingestManualMessageAction(
  _previous: IntegrationActionState,
  formData: FormData
): Promise<IntegrationActionState> {
  const session = await requireSession();
  const parsed = z.object({
    sender: z.string().trim().max(80).default(""),
    message: z.string().trim().min(8, "Paste the complete bank message").max(3000),
  }).safeParse({ sender: formData.get("sender"), message: formData.get("message") });
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message };

  try {
    const result = await ingestFinanceMessage({ userId: session.userId, ...parsed.data });
    refreshAutomationPages();
    return {
      success: true,
      message:
        result.status === "imported"
          ? "Message matched and your finance data was updated."
          : result.status === "duplicate"
            ? "This message was already processed."
            : "Message parsed and added to the review queue.",
    };
  } catch {
    return { success: false, error: "The message could not be processed. Please try again." };
  }
}

export async function approveMessageAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  const parsed = z.object({
    eventId: z.string().trim().min(1),
    accountId: z.string().trim().min(1),
    category: z.string().trim().min(1).max(40),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;

  await connectDB();
  const userId = oid(session.userId);
  const category = resolveAllowedLedgerCategory(
    parsed.data.category,
    await getAllowedLedgerCategoryNames(userId)
  );
  if (!category) return;
  const [event, account] = await Promise.all([
    MessageIngestion.findOne({ _id: oid(parsed.data.eventId), userId, status: "needs_review" }),
    PaymentAccount.findOne({ _id: oid(parsed.data.accountId), userId, isActive: true }),
  ]);
  if (!event || !account) return;

  const message = event.parsed;
  if (event.kind === "bill" && account.type === "credit_card" && message?.billTotalDue) {
    await PaymentAccount.findByIdAndUpdate(account._id, {
      billTotalDue: message.billTotalDue,
      ...(message.billDueDate ? { billDueDate: message.billDueDate } : {}),
    });
    event.accountId = account._id;
    event.status = "imported";
    await event.save();
    if (event.historical) await reconcileAccountsFromMessageHistory(session.userId);
    refreshAutomationPages();
    return;
  }

  if (event.kind === "balance" && account.type !== "credit_card" && message?.availableBalance !== undefined) {
    event.accountId = account._id;
    event.status = "imported";
    await event.save();
    if (event.historical) {
      await reconcileAccountsFromMessageHistory(session.userId);
    } else {
      await PaymentAccount.updateOne(
        { _id: account._id, userId },
        { $set: { currentBalance: message.availableBalance } }
      );
    }
    refreshAutomationPages();
    return;
  }

  const transactionType = message?.type ?? undefined;
  const transactionAmount = message?.amount ?? undefined;
  if (!transactionType || !transactionAmount || event.kind !== "transaction") return;
  const merchant = message?.merchant ?? "";
  const description = message?.description ?? "";
  const sourceReference = message?.reference ?? "";
  const dbSession = await mongoose.startSession();
  try {
    await dbSession.withTransaction(async () => {
      const transactions = await LedgerTransaction.create(
        [{
          userId,
          accountId: account._id,
          type: transactionType,
          amount: transactionAmount,
          category,
          merchant,
          description,
          date: event.occurredAt,
          source: "sms",
          sourceReference,
          ingestionId: event._id,
        }],
        { session: dbSession }
      );
      const transaction = transactions[0];
      if (!transaction) throw new Error("Transaction was not created");
      if (!event.historical) {
        await PaymentAccount.findByIdAndUpdate(
          account._id,
          {
            $inc: {
              currentBalance: transactionBalanceDelta(
                account.type as PaymentAccountType,
                transactionType,
                transactionAmount
              ),
            },
          },
          { session: dbSession }
        );
      }
      await MessageIngestion.updateOne(
        { _id: event._id },
        { status: "imported", accountId: account._id, transactionId: transaction._id },
        { session: dbSession }
      );
    });
  } finally {
    await dbSession.endSession();
  }
  if (event.historical) await reconcileAccountsFromMessageHistory(session.userId);
  refreshAutomationPages();
}

export async function dismissMessageAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  const eventId = String(formData.get("eventId") ?? "");
  if (!mongoose.isValidObjectId(eventId)) return;
  await connectDB();
  await MessageIngestion.updateOne(
    { _id: oid(eventId), userId: oid(session.userId), status: "needs_review" },
    { status: "ignored" }
  );
  refreshAutomationPages();
}
