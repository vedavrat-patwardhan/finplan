import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { LEDGER_CATEGORIES } from "@/lib/finance/constants";

const CategoryRuleSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    keyword: { type: String, required: true, trim: true, maxlength: 80 },
    normalizedKeyword: { type: String, required: true, trim: true, maxlength: 80 },
    category: { type: String, enum: LEDGER_CATEGORIES, required: true },
  },
  { timestamps: true }
);

CategoryRuleSchema.index({ userId: 1, normalizedKeyword: 1 }, { unique: true });

export type ICategoryRule = InferSchemaType<typeof CategoryRuleSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const CategoryRule: Model<ICategoryRule> =
  mongoose.models.CategoryRule ??
  mongoose.model<ICategoryRule>("CategoryRule", CategoryRuleSchema);
