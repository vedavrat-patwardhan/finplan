import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const UserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    username: { type: String, required: true, unique: true, trim: true },
    passwordHash: { type: String, required: true },
    name: { type: String, default: "" },
    monthlyTakeHome: { type: Number, default: 0 },
    currency: { type: String, default: "INR" },
    inflationRate: { type: Number, default: 6 },
    bonusSpreadMonthly: { type: Boolean, default: true },
    retirementMultiplier: { type: Number, default: 25 },
    onboardingCompleted: { type: Boolean, default: false },
    useCompactNumbers: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export type IUser = InferSchemaType<typeof UserSchema> & { _id: mongoose.Types.ObjectId };

export const User: Model<IUser> =
  mongoose.models.User ?? mongoose.model<IUser>("User", UserSchema);
