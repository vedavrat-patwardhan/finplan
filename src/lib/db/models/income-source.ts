import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { FREQUENCIES, INCOME_TYPES } from "@/lib/finance/constants";

const IncomeSourceSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: INCOME_TYPES, required: true },
    /** Always stored as in-hand (after tax) amount */
    amount: { type: Number, required: true, min: 0 },
    frequency: { type: String, enum: FREQUENCIES, required: true },
    isNetAmount: { type: Boolean, default: true },
    grossAmount: { type: Number, min: 0 },
    estimatedTax: { type: Number, min: 0 },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

export type IIncomeSource = InferSchemaType<typeof IncomeSourceSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const IncomeSource: Model<IIncomeSource> =
  mongoose.models.IncomeSource ??
  mongoose.model<IIncomeSource>("IncomeSource", IncomeSourceSchema);
