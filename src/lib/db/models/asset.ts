import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const AssetSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ["cash", "property", "vehicle", "gold", "other"], required: true },
    value: { type: Number, required: true, min: 0 },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

export type IAsset = InferSchemaType<typeof AssetSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Asset: Model<IAsset> =
  mongoose.models.Asset ?? mongoose.model<IAsset>("Asset", AssetSchema);

const LiabilitySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ["home_loan", "personal_loan", "credit_card", "other"], required: true },
    outstanding: { type: Number, required: true, min: 0 },
    emi: { type: Number, default: 0, min: 0 },
    interestRate: { type: Number, default: 0 },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

export type ILiability = InferSchemaType<typeof LiabilitySchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Liability: Model<ILiability> =
  mongoose.models.Liability ?? mongoose.model<ILiability>("Liability", LiabilitySchema);
