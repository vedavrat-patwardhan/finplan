import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { LEDGER_CATEGORIES, TRANSACTION_TYPES } from "@/lib/finance/constants";

const LedgerTransactionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    accountId: {
      type: Schema.Types.ObjectId,
      ref: "PaymentAccount",
      required: true,
      index: true,
    },
    type: { type: String, enum: TRANSACTION_TYPES, required: true },
    amount: { type: Number, required: true, min: 0 },
    category: { type: String, enum: LEDGER_CATEGORIES, required: true },
    merchant: { type: String, default: "", trim: true },
    description: { type: String, default: "", trim: true },
    date: { type: Date, required: true, index: true },
    notes: { type: String, default: "" },
    documentId: { type: Schema.Types.ObjectId, ref: "Document" },
    tags: { type: [String], default: [] },
  },
  { timestamps: true }
);

LedgerTransactionSchema.index({ userId: 1, date: -1 });

export type ILedgerTransaction = InferSchemaType<typeof LedgerTransactionSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const LedgerTransaction: Model<ILedgerTransaction> =
  mongoose.models.LedgerTransaction ??
  mongoose.model<ILedgerTransaction>("LedgerTransaction", LedgerTransactionSchema);
