import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const SavedPasswordSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 100 },
    encryptedValue: { type: String, required: true },
  },
  { timestamps: true }
);

SavedPasswordSchema.index({ userId: 1, createdAt: -1 });

export type ISavedPassword = InferSchemaType<typeof SavedPasswordSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const SavedPassword: Model<ISavedPassword> =
  mongoose.models.SavedPassword ??
  mongoose.model<ISavedPassword>("SavedPassword", SavedPasswordSchema);
