import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import {
  PAYMENT_ACCOUNT_TYPES,
  BANK_ACCOUNT_SUBTYPES,
} from "@/lib/finance/constants";

const PaymentAccountSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, enum: PAYMENT_ACCOUNT_TYPES, required: true },
    name: { type: String, required: true, trim: true },
    institution: { type: String, default: "", trim: true },
    holderName: { type: String, default: "", trim: true },
    lastFour: { type: String, default: "", maxlength: 4 },
    accountNumber: { type: String, default: "" },
    ifscCode: { type: String, default: "", uppercase: true, trim: true },
    accountSubtype: { type: String, enum: BANK_ACCOUNT_SUBTYPES },
    cardNumber: { type: String, default: "" },
    expiryMonth: { type: Number, min: 1, max: 12 },
    expiryYear: { type: Number, min: 2020, max: 2100 },
    upiId: { type: String, default: "", trim: true },
    openingBalance: { type: Number, default: 0 },
    currentBalance: { type: Number, default: 0 },
    currency: { type: String, default: "INR" },
    creditLimit: { type: Number, min: 0 },
    billingDay: { type: Number, min: 1, max: 31 },
    isDefault: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

PaymentAccountSchema.index({ userId: 1, isActive: 1 });

export type IPaymentAccount = InferSchemaType<typeof PaymentAccountSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const PaymentAccount: Model<IPaymentAccount> =
  mongoose.models.PaymentAccount ??
  mongoose.model<IPaymentAccount>("PaymentAccount", PaymentAccountSchema);
