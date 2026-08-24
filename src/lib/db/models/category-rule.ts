import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const CategoryRuleSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    keyword: { type: String, required: true, trim: true, maxlength: 80 },
    normalizedKeyword: { type: String, required: true, trim: true, maxlength: 80 },
    category: { type: String, required: true, trim: true, maxlength: 40 },
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
