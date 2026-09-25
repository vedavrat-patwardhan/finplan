import mongoose from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import {
  CategoryRule,
  MessageIngestion,
  PaymentAccount,
  LedgerTransaction,
} from "@/lib/db/models";
import { encryptSensitive } from "@/lib/crypto/sensitive";
import { financeMessageHash, parseFinanceMessage } from "@/lib/finance/message-parser";
import { transactionBalanceDelta } from "@/lib/finance/ledger";
import type { PaymentAccountType } from "@/lib/finance/constants";
import {
  applyCategoryRules,
  transactionCategoryText,
} from "@/lib/finance/category-rules";

interface IngestInput {
  userId: string;
  sender: string;
  message: string;
  occurredAt?: Date;
  historical?: boolean;
  source?: "sms" | "notification" | "history" | "manual";
}

function senderMatchesInstitution(sender: string, institution: string): boolean {
  const senderKey = sender.toLowerCase().replace(/[^a-z]/g, "");
  const institutionTokens = institution.toLowerCase().match(/[a-z]+/g) ?? [];
  const meaningfulTokens = institutionTokens.filter(
    (token) => token.length >= 3 && token !== "bank"
  );
  const initials = institutionTokens.map((token) => token[0]).join("");

  return (
    meaningfulTokens.some((token) =>
      senderKey.includes(token.slice(0, Math.min(token.length, 5)))
    ) ||
    (initials.length >= 3 && senderKey.includes(initials))
  );
}

export async function ingestFinanceMessage(input: IngestInput) {
  await connectDB();
  const userId = new mongoose.Types.ObjectId(input.userId);
  const sender = input.sender.trim().slice(0, 80);
  const message = input.message.replace(/\s+/g, " ").trim().slice(0, 3000);
  const occurredAt = input.occurredAt && !Number.isNaN(input.occurredAt.getTime())
    ? input.occurredAt
    : new Date();
  const sourceChannel = input.source ?? (input.historical ? "history" : "sms");

  if (!message) throw new Error("Message is required");

  const messageHash = financeMessageHash(input.userId, sender, message);
  const existing = await MessageIngestion.findOne({ userId, messageHash }).lean();
  if (existing) {
    return { id: existing._id.toString(), status: "duplicate" as const, parsed: existing.parsed };
  }

  const parsedMessage = parseFinanceMessage(message);
  const [accounts, categoryRules] = await Promise.all([
    PaymentAccount.find({ userId, isActive: true }).lean(),
    CategoryRule.find({ userId }).lean(),
  ]);
  const parsed = {
    ...parsedMessage,
    category: parsedMessage.category
      ? applyCategoryRules(
          transactionCategoryText(parsedMessage),
          parsedMessage.category,
          categoryRules.map((rule) => ({
            keyword: rule.normalizedKeyword || rule.keyword,
            category: rule.category,
          }))
        )
      : parsedMessage.category,
  };
  let account = parsed.accountLastFour
    ? accounts.find(
        (item) =>
          item.lastFour === parsed.accountLastFour ||
          item.cardLastFour === parsed.accountLastFour
      )
    : undefined;
  let matchedByUniqueSender = false;

  if (!account && sender) {
    const senderMatches = accounts.filter((item) => senderMatchesInstitution(sender, item.institution ?? ""));
    if (senderMatches.length === 1) {
      account = senderMatches[0];
      matchedByUniqueSender = true;
    }
  }

  // The same payment can arrive through an SMS and a bank/Gmail notification
  // with different wording and sender labels. Treat the bank reference as the
  // canonical identity so multiple mobile sources cannot create two ledger rows.
  if (account && parsed.reference) {
    const existingTransaction = await LedgerTransaction.findOne({
      userId,
      accountId: account._id,
      type: parsed.type,
      sourceReference: parsed.reference,
    }).lean();
    if (existingTransaction) {
      return {
        id: existingTransaction.ingestionId?.toString() ?? existingTransaction._id.toString(),
        status: "duplicate" as const,
        parsed,
      };
    }
  }

  // A bank can send SMS, Messaging notifications and delayed email alerts for
  // the same card charge. Android reports both Messaging and Gmail as the
  // notification channel, so sourceChannel alone does not identify a copy.
  // A matching available card limit corroborates delayed copies; otherwise
  // keep the window narrow to protect legitimate repeated purchases.
  if (
    account &&
    !parsed.reference &&
    parsed.kind === "transaction" &&
    parsed.type &&
    parsed.amount !== undefined &&
    (sourceChannel === "sms" || sourceChannel === "notification")
  ) {
    const timeWindowMs = 60 * 60 * 1000;
    const normalizeMerchant = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    const merchantKey = normalizeMerchant(parsed.merchant);
    const candidates = await MessageIngestion.find({
      userId,
      accountId: account._id,
      status: "imported",
      transactionId: { $exists: true },
      sender: { $ne: sender },
      sourceChannel: { $in: ["sms", "notification"] },
      occurredAt: {
        $gte: new Date(occurredAt.getTime() - timeWindowMs),
        $lte: new Date(occurredAt.getTime() + timeWindowMs),
      },
      "parsed.type": parsed.type,
      "parsed.amount": parsed.amount,
    })
      .sort({ occurredAt: -1 })
      .limit(20)
      .lean();
    const existingEvent = candidates.find((event) => {
      const previousMerchant = normalizeMerchant(event.parsed?.merchant ?? "");
      if (!merchantKey || merchantKey !== previousMerchant) return false;
      const previousLimit = event.parsed?.availableLimit;
      if (parsed.availableLimit !== undefined && typeof previousLimit === "number") {
        return Math.abs(parsed.availableLimit - previousLimit) < 0.005;
      }
      return Math.abs(occurredAt.getTime() - event.occurredAt.getTime()) <= 3 * 60 * 1000;
    });
    if (existingEvent) {
      return {
        id: existingEvent._id.toString(),
        status: "duplicate" as const,
        parsed,
      };
    }
  }

  // A unique bank-sender match is as strong an account signal as matching the
  // final four digits in the message. Some valid bank credits omit account digits.
  const confidence = Math.min(
    0.99,
    parsed.confidence + (matchedByUniqueSender ? 0.18 : 0)
  );

  const canImportTransaction =
    parsed.kind === "transaction" &&
    parsed.type &&
    parsed.amount !== undefined &&
    parsed.amount > 0 &&
    account &&
    confidence >= 0.8;
  const canImportBill =
    parsed.kind === "bill" &&
    account?.type === "credit_card" &&
    parsed.billTotalDue !== undefined &&
    parsed.billDueDate &&
    confidence >= 0.8;
  const canImportBalance =
    parsed.kind === "balance" &&
    parsed.availableBalance !== undefined &&
    account &&
    account.type !== "credit_card" &&
    Boolean(parsed.accountLastFour);

  const dbSession = await mongoose.startSession();
  try {
    let result!: { id: string; status: "imported" | "needs_review"; parsed: typeof parsed };
    await dbSession.withTransaction(async () => {
      const [event] = await MessageIngestion.create(
        [
          {
            userId,
            sender,
            encryptedMessage: encryptSensitive(message),
            messageHash,
            occurredAt,
            historical: input.historical ?? false,
            sourceChannel,
            kind: parsed.kind,
            status: canImportTransaction || canImportBill || canImportBalance ? "imported" : "needs_review",
            confidence,
            accountId: account?._id,
            parsed,
          },
        ],
        { session: dbSession }
      );

      if (canImportTransaction && account && parsed.type && parsed.amount !== undefined) {
        const [transaction] = await LedgerTransaction.create(
          [
            {
              userId,
              accountId: account._id,
              type: parsed.type,
              amount: parsed.amount,
              category: parsed.category,
              merchant: parsed.merchant,
              description: parsed.description,
              isEmi: parsed.isEmi ?? false,
              date: occurredAt,
              source: "sms",
              sourceReference: parsed.reference,
              ingestionId: event._id,
            },
          ],
          { session: dbSession }
        );

        const update = input.historical
          ? null
          : parsed.availableBalance !== undefined && account.type !== "credit_card"
            ? { $set: { currentBalance: parsed.availableBalance } }
            : {
              $inc: {
                currentBalance: transactionBalanceDelta(
                  account.type as PaymentAccountType,
                  parsed.type,
                  parsed.amount
                ),
              },
            };
        if (update) {
          await PaymentAccount.findByIdAndUpdate(account._id, update, { session: dbSession });
        }
        event.transactionId = transaction._id;
        await event.save({ session: dbSession });
      } else if (canImportBill && account && !input.historical) {
        await PaymentAccount.findByIdAndUpdate(
          account._id,
          { billTotalDue: parsed.billTotalDue, billDueDate: parsed.billDueDate },
          { session: dbSession }
        );
      } else if (canImportBalance && account && !input.historical) {
        await PaymentAccount.findByIdAndUpdate(
          account._id,
          { currentBalance: parsed.availableBalance },
          { session: dbSession }
        );
      }

      result = {
        id: event._id.toString(),
        status: canImportTransaction || canImportBill || canImportBalance ? "imported" : "needs_review",
        parsed,
      };
    });
    return result;
  } catch (error) {
    if (error instanceof mongoose.mongo.MongoServerError && error.code === 11000) {
      const duplicate = await MessageIngestion.findOne({ userId, messageHash }).lean();
      return {
        id: duplicate?._id.toString() ?? "",
        status: "duplicate" as const,
        parsed: duplicate?.parsed ?? parsed,
      };
    }
    throw error;
  } finally {
    await dbSession.endSession();
  }
}
