import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

export const OBLIGATION_SOURCE_TYPES = [
  "investment",
  "insurance",
  "expense",
  "income",
  "credit_card_bill",
] as const;

const ObligationEventSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    sourceType: { type: String, enum: OBLIGATION_SOURCE_TYPES, required: true },
    sourceId: { type: Schema.Types.ObjectId, required: true },
    dueDate: { type: Date, required: true },
    status: { type: String, enum: ["skipped", "paid"], required: true },
    amount: { type: Number, required: true, min: 0 },
    transactionId: { type: Schema.Types.ObjectId, ref: "LedgerTransaction" },
    paidAt: { type: Date },
  },
  { timestamps: true }
);

ObligationEventSchema.index(
  { userId: 1, sourceType: 1, sourceId: 1, dueDate: 1 },
  { unique: true }
);
ObligationEventSchema.index(
  { userId: 1, transactionId: 1 },
  { unique: true, sparse: true }
);

export type IObligationEvent = InferSchemaType<typeof ObligationEventSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const ObligationEvent: Model<IObligationEvent> =
  mongoose.models.ObligationEvent ??
  mongoose.model<IObligationEvent>("ObligationEvent", ObligationEventSchema);
