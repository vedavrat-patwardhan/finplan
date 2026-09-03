"use server";

import mongoose from "mongoose";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { connectDB } from "@/lib/db/mongoose";
import { AssistantConversation } from "@/lib/db/models";
import { getConversation, listConversations } from "@/lib/db/queries/assistant";
import type { ConversationDTO, ConversationSummaryDTO } from "@/lib/ai/assistant-types";
import type { ActionResult } from "./auth";

function oid(userId: string) {
  return new mongoose.Types.ObjectId(userId);
}

const titleSchema = z.string().trim().min(1, "Title is required").max(80, "Keep the title under 80 characters");

export async function listConversationsAction(): Promise<ConversationSummaryDTO[]> {
  const session = await requireSession();
  return listConversations(session.userId);
}

export async function getConversationAction(id: string): Promise<ConversationDTO | null> {
  const session = await requireSession();
  if (!mongoose.isValidObjectId(id)) return null;
  return getConversation(session.userId, id);
}

export async function deleteConversationAction(id: string): Promise<ActionResult> {
  const session = await requireSession();

  if (!mongoose.isValidObjectId(id)) {
    return { success: false, error: "Chat not found" };
  }

  await connectDB();
  const result = await AssistantConversation.deleteOne({
    _id: id,
    userId: oid(session.userId),
  });

  if (result.deletedCount === 0) {
    return { success: false, error: "Chat not found" };
  }

  revalidatePath("/assistant");
  return { success: true };
}

export async function renameConversationAction(
  id: string,
  title: string
): Promise<ActionResult> {
  const session = await requireSession();

  if (!mongoose.isValidObjectId(id)) {
    return { success: false, error: "Chat not found" };
  }

  const parsed = titleSchema.safeParse(title);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid title" };
  }

  await connectDB();
  const result = await AssistantConversation.updateOne(
    { _id: id, userId: oid(session.userId) },
    { $set: { title: parsed.data } }
  );

  if (result.matchedCount === 0) {
    return { success: false, error: "Chat not found" };
  }

  revalidatePath("/assistant");
  return { success: true };
}
