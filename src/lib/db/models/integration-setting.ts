import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const IntegrationSettingSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    openAiApiKey: { type: String, default: "" },
    openAiKeyHint: { type: String, default: "" },
    openAiModel: { type: String, default: "gpt-5.4-mini", trim: true },
    smsTokenHash: { type: String, default: "", index: true },
    smsTokenHint: { type: String, default: "" },
    smsEnabled: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export type IIntegrationSetting = InferSchemaType<typeof IntegrationSettingSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const IntegrationSetting: Model<IIntegrationSetting> =
  mongoose.models.IntegrationSetting ??
  mongoose.model<IIntegrationSetting>("IntegrationSetting", IntegrationSettingSchema);
