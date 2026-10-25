"use client";

import { useCallback, useRef, useState } from "react";
import { ApiError, errorMessage } from "@/lib/api-client";
import { getConversation, sendChat } from "@/lib/chat";
import { useLLMStatus } from "@/lib/llm-status";
import { useSession } from "@/lib/session";
import type { ChatMessage, ChatMode, ChatResponse, LanguageCode } from "@/types";

interface SendOptions {
  mode: ChatMode;
  language: LanguageCode;
  machineId?: string | null;
  imageData?: string | null;
  voice?: boolean;
  signal?: AbortSignal;
  retry?: boolean;
}

export interface SendResult {
  response?: ChatResponse;
  error?: ApiError | Error;
}

let localCounter = 0;
const localId = () => `local-${Date.now()}-${localCounter++}`;

function describeFailure(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.code === "LLM_UNAVAILABLE") {
      const attempts = (err.details?.attempts || []) as Array<{ provider: string; message?: string; skipped?: boolean }>;
      const tried = attempts.filter((a) => !a.skipped).map((a) => `${a.provider}: ${a.message}`);
      return tried.length ? `${err.message} (${tried.join("; ")})` : err.message;
    }
    return err.message;
  }
  return errorMessage(err);
}

export function useConversation() {
  const { selectedModel } = useSession();
  const { refresh: refreshProviders } = useLLMStatus();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const conversationRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    conversationRef.current = null;
    setConversationId(null);
    setMessages([]);
    setLoadError(null);
  }, []);

  const load = useCallback(async (id: string) => {
    setLoadingHistory(true);
    setLoadError(null);
    try {
      const detail = await getConversation(id);
      conversationRef.current = detail.id;
      setConversationId(detail.id);
      setMessages(detail.messages.map((m) => ({ ...m, conversation_id: detail.id }) as ChatMessage));
      return detail;
    } catch (err) {
      setLoadError(errorMessage(err, "Could not load this conversation."));
      return null;
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  const send = useCallback(
    async (text: string, opts: SendOptions): Promise<SendResult> => {
      const message = text.trim();
      if (!message) return {};
      const controller = new AbortController();
      abortRef.current = controller;
      const onAbort = () => controller.abort();
      opts.signal?.addEventListener("abort", onAbort);

      setMessages((prev) => {
        const kept = prev.filter((m) => !m.failed);
        // On retry, the question is already on screen: replace it instead of duplicating it.
        if (opts.retry && kept.length && kept[kept.length - 1].sender === "user") kept.pop();
        return kept;
      });
      setMessages((prev) => [
        ...prev,
        { id: localId(), conversation_id: conversationRef.current || "", sender: "user", content: message, created_at: new Date().toISOString() },
      ]);
      setSending(true);
      try {
        const response = await sendChat({
          message,
          conversationId: conversationRef.current,
          language: opts.language,
          model: selectedModel,
          mode: opts.mode,
          machineId: opts.machineId,
          imageData: opts.imageData,
          voice: opts.voice,
          signal: controller.signal,
        });
        conversationRef.current = response.conversation_id;
        setConversationId(response.conversation_id);
        setMessages((prev) => [
          ...prev,
          {
            id: response.message_id || localId(),
            conversation_id: response.conversation_id,
            sender: "assistant",
            content: response.answer,
            groundedness_status: response.confidence_status,
            citations: response.citations,
            model_used: response.model_used,
            provider: response.provider,
            fallback_used: response.fallback_used,
            degraded: response.degraded,
            attempts: response.attempts,
            latency_ms: response.latency_ms,
            created_at: new Date().toISOString(),
          },
        ]);
        return { response };
      } catch (err: any) {
        if (err?.code === "ABORTED") {
          setMessages((prev) => [
            ...prev,
            { id: localId(), conversation_id: "", sender: "assistant", content: "Stopped. The question was not answered.", failed: true, errorCode: "ABORTED", created_at: new Date().toISOString() },
          ]);
          return { error: err };
        }
        const convId = err instanceof ApiError ? err.details?.conversation_id : undefined;
        if (convId) {
          conversationRef.current = convId;
          setConversationId(convId);
        }
        setMessages((prev) => [
          ...prev,
          {
            id: localId(),
            conversation_id: conversationRef.current || "",
            sender: "assistant",
            content: describeFailure(err),
            failed: true,
            errorCode: err instanceof ApiError ? err.code : "ERROR",
            created_at: new Date().toISOString(),
          },
        ]);
        return { error: err };
      } finally {
        opts.signal?.removeEventListener("abort", onAbort);
        if (abortRef.current === controller) abortRef.current = null;
        setSending(false);
        refreshProviders(); // provider states change after real calls
      }
    },
    [selectedModel, refreshProviders],
  );

  const stop = useCallback(() => abortRef.current?.abort(), []);

  /** Text of the user message that preceded the last failed answer (for "Try again"). */
  const lastQuestion = useCallback(() => {
    for (let i = messages.length - 1; i >= 0; i--) if (messages[i].sender === "user") return messages[i].content;
    return null;
  }, [messages]);

  return { conversationId, messages, sending, loadingHistory, loadError, send, stop, reset, load, lastQuestion, setMessages };
}
