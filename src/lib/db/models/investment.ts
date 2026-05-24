import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { FREQUENCIES, INVESTMENT_TYPES } from "@/lib/finance/constants";

const InvestmentSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: INVESTMENT_TYPES, required: true },
    amount: { type: Number, required: true, min: 0 },
    frequency: { type: String, enum: FREQUENCIES, required: true },
    expectedReturnPct: { type: Number, default: 12 },
    startDate: { type: Date, default: Date.now },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

export type IInvestment = InferSchemaType<typeof InvestmentSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Investment: Model<IInvestment> =
  mongoose.models.Investment ??
  mongoose.model<IInvestment>("Investment", InvestmentSchema);
