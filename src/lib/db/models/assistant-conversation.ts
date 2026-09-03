import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const AssistantMessageSchema = new Schema(
  {
    role: { type: String, enum: ["user", "assistant"], required: true },
    content: { type: String, required: true },
    toolsUsed: { type: [String], default: [] },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const AssistantConversationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, default: "New chat", trim: true, maxlength: 120 },
    /** OpenAI model used for the latest reply, informational only. */
    model: { type: String, default: "", trim: true },
    messages: { type: [AssistantMessageSchema], default: [] },
    lastMessageAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

AssistantConversationSchema.index({ userId: 1, lastMessageAt: -1 });

export type IAssistantMessage = InferSchemaType<typeof AssistantMessageSchema>;

export type IAssistantConversation = InferSchemaType<typeof AssistantConversationSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const AssistantConversation: Model<IAssistantConversation> =
  mongoose.models.AssistantConversation ??
  mongoose.model<IAssistantConversation>("AssistantConversation", AssistantConversationSchema);
