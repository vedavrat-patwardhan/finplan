import { cache } from "react";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import { AssistantConversation } from "@/lib/db/models";
import type { AssistantMessageDTO, ConversationDTO, ConversationSummaryDTO } from "@/lib/ai/assistant-types";

function oid(userId: string) {
  return new mongoose.Types.ObjectId(userId);
}

const PREVIEW_CHARS = 80;

export const listConversations = cache(
  async (userId: string): Promise<ConversationSummaryDTO[]> => {
    await connectDB();
    const items = await AssistantConversation.find({ userId: oid(userId) })
      .sort({ lastMessageAt: -1 })
      .limit(50)
      .lean();

    return items.map((item) => {
      const messages = item.messages ?? [];
      const last = messages[messages.length - 1];
      return {
        id: item._id.toString(),
        title: item.title || "New chat",
        updatedAt: (item.lastMessageAt ?? item.updatedAt ?? new Date()).toISOString(),
        messageCount: messages.length,
        preview: last ? last.content.slice(0, PREVIEW_CHARS) : "",
      };
    });
  }
);

export const getConversation = cache(
  async (userId: string, id: string): Promise<ConversationDTO | null> => {
    if (!mongoose.isValidObjectId(id)) return null;

    await connectDB();
    const item = await AssistantConversation.findOne({ _id: id, userId: oid(userId) }).lean();
    if (!item) return null;

    const messages: AssistantMessageDTO[] = (item.messages ?? []).map((message) => ({
      role: message.role,
      content: message.content,
      createdAt: (message.createdAt ?? new Date()).toISOString(),
      toolsUsed: message.toolsUsed?.length ? message.toolsUsed : undefined,
    }));

    return {
      id: item._id.toString(),
      title: item.title || "New chat",
      model: item.model ?? "",
      messages,
    };
  }
);
