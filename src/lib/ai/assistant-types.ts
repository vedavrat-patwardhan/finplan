/**
 * Shared contract between the assistant API route, the persistence layer and
 * the chat UI. Keep this file dependency-free (types + constants only).
 */

export type AssistantRole = "user" | "assistant";

export interface AssistantMessageDTO {
  role: AssistantRole;
  content: string;
  /** ISO timestamp */
  createdAt: string;
  /** Names of the data tools the model called while producing this reply. */
  toolsUsed?: string[];
}

export interface ConversationSummaryDTO {
  id: string;
  title: string;
  /** ISO timestamp of the last message */
  updatedAt: string;
  messageCount: number;
  /** First ~80 characters of the latest message, for list previews. */
  preview: string;
}

export interface ConversationDTO {
  id: string;
  title: string;
  model: string;
  messages: AssistantMessageDTO[];
}

/** POST /api/assistant/chat request body */
export interface AssistantChatRequest {
  /** Omit to start a new conversation. */
  conversationId?: string;
  message: string;
}

/** POST /api/assistant/chat success body */
export interface AssistantChatResponse {
  conversationId: string;
  title: string;
  message: string;
  toolsUsed: string[];
  /** ISO timestamp of the finance snapshot used for this answer */
  asOf: string;
  requestId?: string;
}

/** POST /api/assistant/chat error body */
export interface AssistantChatError {
  error: string;
}

/** How many prior messages of a conversation are replayed to the model. */
export const ASSISTANT_HISTORY_WINDOW = 24;

/** Longest user message accepted by the chat endpoint. */
export const ASSISTANT_MAX_MESSAGE_CHARS = 6000;

/** Conversation title length cap (derived from the first user message). */
export const ASSISTANT_TITLE_MAX_CHARS = 80;
