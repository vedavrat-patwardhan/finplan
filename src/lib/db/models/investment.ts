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
    absoluteReturnPct: { type: Number },
    monthlyWithdrawalPct: { type: Number, min: 0, max: 100 },
    startDate: { type: Date, default: Date.now },
    deductionDay: { type: Number, min: 1, max: 31 },
    lastPaidDate: { type: Date },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

export type IInvestment = InferSchemaType<typeof InvestmentSchema> & {
  _id: mongoose.Types.ObjectId;
};

if (process.env.NODE_ENV !== "production" && mongoose.models.Investment) {
  mongoose.deleteModel("Investment");
}

export const Investment: Model<IInvestment> =
  mongoose.models.Investment ??
  mongoose.model<IInvestment>("Investment", InvestmentSchema);
