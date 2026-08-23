import mongoose from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import { MessageIngestion, PaymentAccount, LedgerTransaction } from "@/lib/db/models";
import { encryptSensitive } from "@/lib/crypto/sensitive";
import { financeMessageHash, parseFinanceMessage } from "@/lib/finance/message-parser";
import { transactionBalanceDelta } from "@/lib/finance/ledger";
import type { PaymentAccountType } from "@/lib/finance/constants";

interface IngestInput {
  userId: string;
  sender: string;
  message: string;
  occurredAt?: Date;
}

function senderMatchesInstitution(sender: string, institution: string): boolean {
  const senderKey = sender.toLowerCase().replace(/[^a-z]/g, "");
  const bankKey = institution.toLowerCase().replace(/[^a-z]/g, "");
  return bankKey.length >= 3 && senderKey.includes(bankKey.slice(0, Math.min(bankKey.length, 6)));
}

export async function ingestFinanceMessage(input: IngestInput) {
  await connectDB();
  const userId = new mongoose.Types.ObjectId(input.userId);
  const sender = input.sender.trim().slice(0, 80);
  const message = input.message.replace(/\s+/g, " ").trim().slice(0, 3000);
  const occurredAt = input.occurredAt && !Number.isNaN(input.occurredAt.getTime())
    ? input.occurredAt
    : new Date();

  if (!message) throw new Error("Message is required");

  const messageHash = financeMessageHash(input.userId, sender, message);
  const existing = await MessageIngestion.findOne({ userId, messageHash }).lean();
  if (existing) {
    return { id: existing._id.toString(), status: "duplicate" as const, parsed: existing.parsed };
  }

  const parsed = parseFinanceMessage(message);
  const accounts = await PaymentAccount.find({ userId, isActive: true }).lean();
  let account = parsed.accountLastFour
    ? accounts.find((item) => item.lastFour === parsed.accountLastFour)
    : undefined;

  if (!account && sender) {
    const senderMatches = accounts.filter((item) => senderMatchesInstitution(sender, item.institution ?? ""));
    if (senderMatches.length === 1) account = senderMatches[0];
  }

  const canImportTransaction =
    parsed.kind === "transaction" &&
    parsed.type &&
    parsed.amount !== undefined &&
    parsed.amount > 0 &&
    account &&
    parsed.confidence >= 0.8;
  const canImportBill =
    parsed.kind === "bill" &&
    account?.type === "credit_card" &&
    parsed.billTotalDue !== undefined &&
    parsed.billDueDate &&
    parsed.confidence >= 0.8;

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
            kind: parsed.kind,
            status: canImportTransaction || canImportBill ? "imported" : "needs_review",
            confidence: parsed.confidence,
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
              date: occurredAt,
              source: "sms",
              sourceReference: parsed.reference,
              ingestionId: event._id,
            },
          ],
          { session: dbSession }
        );

        const update = parsed.availableBalance !== undefined && account.type !== "credit_card"
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
        await PaymentAccount.findByIdAndUpdate(account._id, update, { session: dbSession });
        event.transactionId = transaction._id;
        await event.save({ session: dbSession });
      } else if (canImportBill && account) {
        await PaymentAccount.findByIdAndUpdate(
          account._id,
          { billTotalDue: parsed.billTotalDue, billDueDate: parsed.billDueDate },
          { session: dbSession }
        );
      }

      result = {
        id: event._id.toString(),
        status: canImportTransaction || canImportBill ? "imported" : "needs_review",
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
