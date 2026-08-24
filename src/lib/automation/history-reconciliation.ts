import mongoose from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import { MessageIngestion, PaymentAccount } from "@/lib/db/models";

export interface HistoryReconciliationResult {
  balancesUpdated: number;
  billsUpdated: number;
  balanceAccounts: string[];
  billAccounts: string[];
}

export async function reconcileAccountsFromMessageHistory(
  rawUserId: string
): Promise<HistoryReconciliationResult> {
  await connectDB();
  const userId = new mongoose.Types.ObjectId(rawUserId);
  const accounts = await PaymentAccount.find({ userId, isActive: true }).lean();
  const result: HistoryReconciliationResult = {
    balancesUpdated: 0,
    billsUpdated: 0,
    balanceAccounts: [],
    billAccounts: [],
  };
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const account of accounts) {
    if (account.type === "credit_card") {
      const latestBill = await MessageIngestion.findOne({
        userId,
        accountId: account._id,
        status: "imported",
        "parsed.billTotalDue": { $exists: true },
        "parsed.billDueDate": { $gte: today },
      })
        .sort({ occurredAt: -1 })
        .lean();

      if (latestBill?.parsed?.billTotalDue !== undefined) {
        await PaymentAccount.updateOne(
          { _id: account._id, userId },
          {
            $set: {
              billTotalDue: latestBill.parsed.billTotalDue,
              billDueDate: latestBill.parsed.billDueDate,
            },
          }
        );
        result.billsUpdated += 1;
        result.billAccounts.push(account.name);
      }
      continue;
    }

    const latestBalance = await MessageIngestion.findOne({
      userId,
      accountId: account._id,
      status: "imported",
      "parsed.availableBalance": { $exists: true },
    })
      .sort({ occurredAt: -1 })
      .lean();

    if (latestBalance?.parsed?.availableBalance !== undefined) {
      await PaymentAccount.updateOne(
        { _id: account._id, userId },
        { $set: { currentBalance: latestBalance.parsed.availableBalance } }
      );
      result.balancesUpdated += 1;
      result.balanceAccounts.push(account.name);
    }
  }

  return result;
}
