"use client";

import React, { useState } from "react";
import { Check, Copy, FileText, RotateCcw, ThumbsDown, ThumbsUp, Volume2 } from "lucide-react";
import { Badge, cx } from "@/components/ui/primitives";
import { fetchApi } from "@/lib/api-client";
import type { ChatMessage, Citation } from "@/types";
import RichText from "./RichText";

const GROUNDING: Record<string, { label: string; tone: "success" | "warning" | "neutral" | "accent" }> = {
  supported: { label: "From your documents", tone: "success" },
  insufficient_evidence: { label: "Not found in your documents", tone: "warning" },
  general: { label: "General answer, not from your documents", tone: "neutral" },
};

interface MessageViewProps {
  message: ChatMessage;
  onCitation: (c: Citation) => void;
  onSpeak?: (text: string) => void;
  onRetry?: () => void;
}

export default function MessageView({ message, onCitation, onSpeak, onRetry }: MessageViewProps) {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<number | null>(message.feedback ?? null);
  const [feedbackError, setFeedbackError] = useState(false);

  if (message.sender === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-brand/90 px-4 py-2.5 text-sm leading-relaxed text-white sm:max-w-[70%]">
          {message.content}
        </div>
      </div>
    );
  }

  if (message.failed) {
    return (
      <div className="max-w-[92%] rounded-xl border border-danger/35 bg-danger/[0.06] px-4 py-3 text-sm sm:max-w-[80%]">
        <p className="font-medium text-txt-primary">The answer could not be generated</p>
        <p className="mt-1 text-txt-muted">{message.content}</p>
        {onRetry && (
          <button onClick={onRetry} className="btn-secondary mt-3 h-8 px-3 text-xs">
            <RotateCcw className="h-3.5 w-3.5" /> Try again
          </button>
        )}
      </div>
    );
  }

  const grounding = message.groundedness_status ? GROUNDING[message.groundedness_status] : null;
  const failedAttempts = (message.attempts || []).filter((a) => !a.ok && !a.skipped);
  const persisted = !message.id.startsWith("local-");

  const sendFeedback = async (rating: number) => {
    setFeedback(rating);
    setFeedbackError(false);
    try {
      await fetchApi("/api/v1/feedback", { method: "POST", body: JSON.stringify({ message_id: message.id, rating }) });
    } catch {
      setFeedback(message.feedback ?? null);
      setFeedbackError(true);
    }
  };

  return (
    <div className="group max-w-full sm:max-w-[88%]">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        {message.degraded ? (
          <Badge tone="warning">Offline: quoted from documents, no AI model</Badge>
        ) : (
          grounding && <Badge tone={grounding.tone}>{grounding.label}</Badge>
        )}
        {message.model_used && !["forgewise-greeting", "retrieval-only", "offline-extractive"].includes(message.model_used) && (
          <span className="text-xs text-txt-faint">{message.model_used}</span>
        )}
        {message.fallback_used && failedAttempts.length > 0 && (
          <span className="text-xs text-txt-faint" title={failedAttempts.map((a) => `${a.model_id}: ${a.message}`).join("\n")}>
            after {failedAttempts.map((a) => a.provider).join(", ")} failed
          </span>
        )}
      </div>

      <div className="text-txt-primary">
        <RichText text={message.content} />
      </div>

      {message.citations && message.citations.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {message.citations.map((c, idx) => (
            <button
              key={c.citation_id || idx}
              onClick={() => onCitation(c)}
              className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-border-subtle bg-elevated/50 px-2 py-1 text-xs text-txt-muted transition-colors hover:border-accent/50 hover:text-txt-primary"
            >
              <FileText className="h-3.5 w-3.5 shrink-0 text-accent" />
              <span className="truncate">{c.document_title}</span>
              <span className="shrink-0 text-txt-faint">p. {c.page_number}</span>
            </button>
          ))}
        </div>
      )}

      <div className="mt-2 flex items-center gap-0.5 text-txt-faint opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
        <button
          className="icon-btn h-7 w-7"
          aria-label="Copy answer"
          onClick={() => {
            navigator.clipboard?.writeText(message.content).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            });
          }}
        >
          {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
        {onSpeak && (
          <button className="icon-btn h-7 w-7" aria-label="Read answer aloud" onClick={() => onSpeak(message.content)}>
            <Volume2 className="h-3.5 w-3.5" />
          </button>
        )}
        {persisted && (
          <>
            <button
              className={cx("icon-btn h-7 w-7", feedback === 1 && "text-success")}
              aria-label="Helpful"
              aria-pressed={feedback === 1}
              onClick={() => sendFeedback(1)}
            >
              <ThumbsUp className="h-3.5 w-3.5" />
            </button>
            <button
              className={cx("icon-btn h-7 w-7", feedback === -1 && "text-danger")}
              aria-label="Not helpful"
              aria-pressed={feedback === -1}
              onClick={() => sendFeedback(-1)}
            >
              <ThumbsDown className="h-3.5 w-3.5" />
            </button>
          </>
        )}
        {typeof message.latency_ms === "number" && message.latency_ms > 0 && (
          <span className="ml-2 text-2xs">{message.latency_ms < 100 ? "<0.1" : (message.latency_ms / 1000).toFixed(1)} s</span>
        )}
        {feedbackError && <span className="ml-2 text-2xs text-danger">Feedback not saved</span>}
      </div>
    </div>
  );
}
