import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { DOCUMENT_TYPES, EXTRACTION_STATUSES } from "@/lib/finance/constants";

const DocumentSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, enum: DOCUMENT_TYPES, required: true },
    s3Key: { type: String, required: true },
    fileName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true, min: 0 },
    periodStart: { type: Date },
    periodEnd: { type: Date },
    accountId: { type: Schema.Types.ObjectId, ref: "PaymentAccount" },
    manualData: { type: Schema.Types.Mixed, default: {} },
    extractedData: { type: Schema.Types.Mixed, default: {} },
    extractionStatus: {
      type: String,
      enum: EXTRACTION_STATUSES,
      default: "none",
    },
    linkedTransactionIds: {
      type: [{ type: Schema.Types.ObjectId, ref: "LedgerTransaction" }],
      default: [],
    },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

DocumentSchema.index({ userId: 1, type: 1, createdAt: -1 });

export type IDocument = InferSchemaType<typeof DocumentSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Document: Model<IDocument> =
  mongoose.models.Document ?? mongoose.model<IDocument>("Document", DocumentSchema);
