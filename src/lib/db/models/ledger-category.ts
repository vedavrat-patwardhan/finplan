import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const LedgerCategorySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 40 },
    normalizedName: { type: String, required: true, trim: true, maxlength: 40 },
  },
  { timestamps: true }
);

LedgerCategorySchema.index({ userId: 1, normalizedName: 1 }, { unique: true });

export type ILedgerCategory = InferSchemaType<typeof LedgerCategorySchema> & {
  _id: mongoose.Types.ObjectId;
};

export const LedgerCategoryModel: Model<ILedgerCategory> =
  mongoose.models.LedgerCategory ??
  mongoose.model<ILedgerCategory>("LedgerCategory", LedgerCategorySchema);
