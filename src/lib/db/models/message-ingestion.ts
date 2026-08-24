import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { TRANSACTION_TYPES } from "@/lib/finance/constants";

const MessageIngestionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    sender: { type: String, default: "", trim: true },
    encryptedMessage: { type: String, required: true },
    messageHash: { type: String, required: true },
    occurredAt: { type: Date, required: true, index: true },
    receivedAt: { type: Date, default: Date.now },
    historical: { type: Boolean, default: false, index: true },
    kind: {
      type: String,
      enum: ["transaction", "bill", "balance", "unknown"],
      default: "unknown",
    },
    status: {
      type: String,
      enum: ["imported", "needs_review", "ignored", "duplicate", "error"],
      default: "needs_review",
      index: true,
    },
    confidence: { type: Number, min: 0, max: 1, default: 0 },
    accountId: { type: Schema.Types.ObjectId, ref: "PaymentAccount" },
    transactionId: { type: Schema.Types.ObjectId, ref: "LedgerTransaction" },
    parsed: {
      type: { type: String, enum: TRANSACTION_TYPES },
      amount: { type: Number, min: 0 },
      category: { type: String, trim: true, maxlength: 40 },
      merchant: { type: String, default: "" },
      description: { type: String, default: "" },
      accountLastFour: { type: String, default: "" },
      reference: { type: String, default: "" },
      availableBalance: { type: Number, min: 0 },
      billTotalDue: { type: Number, min: 0 },
      billMinimumDue: { type: Number, min: 0 },
      billDueDate: { type: Date },
    },
    error: { type: String, default: "" },
  },
  { timestamps: true }
);

MessageIngestionSchema.index({ userId: 1, messageHash: 1 }, { unique: true });
MessageIngestionSchema.index({ userId: 1, status: 1, occurredAt: -1 });

export type IMessageIngestion = InferSchemaType<typeof MessageIngestionSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const MessageIngestion: Model<IMessageIngestion> =
  mongoose.models.MessageIngestion ??
  mongoose.model<IMessageIngestion>("MessageIngestion", MessageIngestionSchema);
