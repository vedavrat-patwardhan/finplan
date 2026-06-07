import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { FREQUENCIES, INSURANCE_TYPES } from "@/lib/finance/constants";

const InsurancePolicySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true },
    provider: { type: String, default: "", trim: true },
    type: { type: String, enum: INSURANCE_TYPES, required: true },
    premium: { type: Number, required: true, min: 0 },
    frequency: { type: String, enum: FREQUENCIES, required: true },
    coverage: { type: Number, default: 0, min: 0 },
    renewalDate: { type: Date },
    premiumStartDate: { type: Date },
    premiumEndDate: { type: Date },
    validTill: { type: Date },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

export type IInsurancePolicy = InferSchemaType<typeof InsurancePolicySchema> & {
  _id: mongoose.Types.ObjectId;
};

if (process.env.NODE_ENV !== "production" && mongoose.models.InsurancePolicy) {
  mongoose.deleteModel("InsurancePolicy");
}

export const InsurancePolicy: Model<IInsurancePolicy> =
  mongoose.models.InsurancePolicy ??
  mongoose.model<IInsurancePolicy>("InsurancePolicy", InsurancePolicySchema);
