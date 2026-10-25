import { fetchApi } from "./api-client";
import type { ChatMode, ChatResponse, ConversationDetail, ConversationSummary, LanguageCode } from "@/types";

export interface SendChatInput {
  message: string;
  conversationId?: string | null;
  language: LanguageCode;
  model?: string | null;
  mode: ChatMode;
  machineId?: string | null;
  imageData?: string | null;
  voice?: boolean;
  signal?: AbortSignal;
}

// Above the backend's LLM_TOTAL_TIMEOUT_SECONDS (90 s) so the server answers first.
const CHAT_TIMEOUT_MS = 120_000;

export function sendChat(input: SendChatInput) {
  return fetchApi<ChatResponse>("/api/v1/chat", {
    method: "POST",
    timeoutMs: CHAT_TIMEOUT_MS,
    signal: input.signal,
    body: JSON.stringify({
      message: input.message,
      conversation_id: input.conversationId || undefined,
      language: input.language,
      model: input.model || undefined,
      mode: input.mode,
      machine_id: input.machineId || undefined,
      image_data: input.imageData || undefined,
      voice: input.voice || false,
    }),
  });
}

export function listConversations(limit = 50) {
  return fetchApi<ConversationSummary[]>(`/api/v1/chat/history?limit=${limit}`);
}

export function getConversation(id: string) {
  return fetchApi<ConversationDetail>(`/api/v1/chat/conversations/${encodeURIComponent(id)}`);
}

export function deleteConversation(id: string) {
  return fetchApi<{ status: string }>(`/api/v1/chat/conversations/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export function newConversationId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

export const MODE_LABEL: Record<ChatMode, string> = {
  grounded: "Documents only",
  general: "General assistant",
};
