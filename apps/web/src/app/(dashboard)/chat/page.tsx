"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import {
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  RotateCcw,
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  HardHat,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Sparkles,
} from "lucide-react";
import CitationsDrawer from "@/components/chat/CitationsDrawer";
import { useVoice } from "@/hooks/use-voice";
import { useTranslation } from "@/lib/i18n";
import { fetchApi } from "@/lib/api-client";
import { ChatMessage, Citation, Machine } from "@/types";

export default function ChatConsolePage() {
  const searchParams = useSearchParams();
  const machineParam = searchParams.get("machine");

  const { t, locale } = useTranslation();
  const {
    isRecording,
    isSpeaking,
    transcript,
    isSupported: voiceSupported,
    startRecording,
    stopRecording,
    speakText,
    stopSpeaking,
    repeatLastAnswer,
  } = useVoice(locale);

  const [inputMessage, setInputMessage] = useState("");
  const [selectedMachine, setSelectedMachine] = useState<string>(machineParam || "");
  const [machines, setMachines] = useState<Machine[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [feedbackSent, setFeedbackSent] = useState<Record<string, number>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync voice transcript to input
  useEffect(() => {
    if (transcript) {
      setInputMessage(transcript);
    }
  }, [transcript]);

  // Load machine list
  useEffect(() => {
    async function loadMachines() {
      try {
        const data = await fetchApi<Machine[]>("/api/v1/machines");
        setMachines(data);
      } catch (err) {
        console.error("Machine load error:", err);
      }
    }
    loadMachines();
  }, []);

  // Initial greeting
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: "welcome-1",
          conversation_id: "welcome",
          sender: "assistant",
          content:
            locale === "hi"
              ? "नमस्ते! मैं ForgeWise AI हूँ, आपका औद्योगिक ज्ञान सहायक। आप SOP, उपकरण टॉर्क, हाइड्रोलिक दबाव, या त्रुटि कोड के बारे में पूछ सकते हैं।"
              : "Welcome to ForgeWise AI. I am your grounded industrial knowledge copilot. Ask me about pump seal torque, CNC chiller error codes (E-304), or hydraulic valve troubleshooting.",
          groundedness_status: "supported",
          created_at: new Date().toISOString(),
        },
      ]);
    }
  }, [locale, messages.length]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (queryText?: string) => {
    const textToSend = queryText || inputMessage;
    if (!textToSend.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      conversation_id: "active",
      sender: "user",
      content: textToSend.trim(),
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage("");
    setLoading(true);

    try {
      const response = await fetchApi<any>("/api/v1/chat", {
        method: "POST",
        body: JSON.stringify({
          message: textToSend.trim(),
          language: locale,
          machine_id: selectedMachine || undefined,
        }),
      });

      const assistantMsg: ChatMessage = {
        id: `ast-${Date.now()}`,
        conversation_id: response.conversation_id,
        sender: "assistant",
        content: response.answer,
        groundedness_status: response.confidence_status,
        citations: response.citations,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMsg]);

      // If speech was used, read answer
      if (isRecording) {
        speakText(response.answer);
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        conversation_id: "error",
        sender: "assistant",
        content:
          err.message ||
          "Unable to retrieve verified documentation from knowledge engine.",
        groundedness_status: "insufficient_evidence",
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleFeedback = async (messageId: string, rating: number) => {
    setFeedbackSent((prev) => ({ ...prev, [messageId]: rating }));
    try {
      await fetchApi("/api/v1/feedback", {
        method: "POST",
        body: JSON.stringify({ message_id: messageId, rating }),
      });
    } catch (err) {
      console.error("Feedback submit error:", err);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] min-h-[500px] rounded-xl border border-border-subtle bg-surface shadow-xs overflow-hidden">
      {/* Chat Header & Equipment Filter */}
      <div className="border-b border-border-subtle bg-elevated/40 p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2.5">
          <div className="h-8 w-8 rounded-lg bg-brand text-white flex items-center justify-center font-mono font-bold text-xs">
            FW
          </div>
          <div>
            <h2 className="font-semibold text-sm text-txt-primary flex items-center gap-1.5">
              <span>{t("nav.chat")}</span>
              <span className="flex items-center gap-1 text-[10px] font-mono text-success rounded bg-success/15 px-1.5 py-0.2">
                <CheckCircle2 className="h-2.5 w-2.5" /> Grounded
              </span>
            </h2>
            <p className="text-[11px] text-txt-muted font-mono">
              Hybrid pgvector + PostgreSQL FTS
            </p>
          </div>
        </div>

        {/* Machine Asset Filter Selector */}
        <div className="flex items-center gap-2">
          <Cpu className="h-4 w-4 text-txt-muted hidden sm:inline" />
          <select
            value={selectedMachine}
            onChange={(e) => setSelectedMachine(e.target.value)}
            className="rounded-md border border-border-subtle bg-surface px-3 py-1.5 text-xs text-txt-primary focus:outline-none focus:border-teal font-mono"
          >
            <option value="">{t("chat.allMachines")}</option>
            {machines.map((m) => (
              <option key={m.id} value={m.id}>
                {m.id} • {m.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {messages.map((msg) => {
          const isUser = msg.sender === "user";
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
            >
              <div
                className={`max-w-2xl rounded-xl p-4 sm:p-5 text-sm leading-relaxed shadow-xs ${
                  isUser
                    ? "bg-brand text-white rounded-br-none"
                    : "bg-elevated/50 border border-border-subtle text-txt-primary rounded-bl-none"
                }`}
              >
                {/* Assistant Grounding & Safety Callout */}
                {!isUser && (
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-border-subtle/60 pb-2">
                    <div className="flex items-center gap-1.5 text-xs font-mono">
                      {msg.groundedness_status === "supported" ? (
                        <span className="flex items-center gap-1 text-success">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>100% Document Grounded</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-warning">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          <span>No Grounded Data Available</span>
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => copyToClipboard(msg.id, msg.content)}
                        className="p-1 rounded text-txt-muted hover:text-txt-primary"
                        title={t("chat.copyAnswer")}
                      >
                        {copiedId === msg.id ? (
                          <Check className="h-3.5 w-3.5 text-success" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                      <button
                        onClick={() => speakText(msg.content)}
                        className="p-1 rounded text-txt-muted hover:text-txt-primary"
                        title={t("chat.repeatSpeech")}
                      >
                        <Volume2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Message Body */}
                <div className="whitespace-pre-wrap font-sans text-sm">
                  {msg.content}
                </div>

                {/* Citation Chips */}
                {!isUser && msg.citations && msg.citations.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-border-subtle/60 space-y-2">
                    <span className="font-mono text-[11px] uppercase tracking-wider text-txt-muted block">
                      {t("chat.citationsHeader")}:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {msg.citations.map((c, idx) => (
                        <button
                          key={c.citation_id || idx}
                          onClick={() => setActiveCitation(c)}
                          className="flex items-center gap-1.5 rounded-md border border-border-subtle bg-surface px-2.5 py-1 text-xs font-mono text-teal hover:border-teal hover:bg-surface/80 transition-colors"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          <span>
                            {c.document_title?.split(" ")[0]} p.{c.page_number}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Operator Feedback Buttons */}
                {!isUser && msg.id !== "welcome-1" && (
                  <div className="mt-3 flex items-center justify-between text-xs text-txt-muted pt-2">
                    <span>{t("chat.feedbackPrompt")}</span>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleFeedback(msg.id, 1)}
                        className={`p-1 rounded ${
                          feedbackSent[msg.id] === 1 ? "text-success font-bold" : "hover:text-txt-primary"
                        }`}
                        title="Helpful"
                      >
                        <ThumbsUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleFeedback(msg.id, -1)}
                        className={`p-1 rounded ${
                          feedbackSent[msg.id] === -1 ? "text-danger font-bold" : "hover:text-txt-primary"
                        }`}
                        title="Unhelpful"
                      >
                        <ThumbsDown className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex items-center space-x-2 text-txt-muted font-mono text-xs p-3">
            <span className="h-2 w-2 rounded-full bg-teal animate-ping" />
            <span>Retrieving SOP chunks and verifying citations...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Prompts Bar */}
      <div className="border-t border-border-subtle bg-elevated/20 px-4 py-2 flex items-center gap-2 overflow-x-auto text-xs">
        <span className="font-mono text-[10px] uppercase tracking-wider text-txt-muted whitespace-nowrap">
          Quick Diagnostics:
        </span>
        <button
          onClick={() => handleSendMessage("What is the seal gland torque for pump PMP-402?")}
          className="rounded border border-border-subtle bg-surface px-2.5 py-1 text-xs text-txt-primary hover:border-teal whitespace-nowrap"
        >
          PMP-402 Torque Specs
        </button>
        <button
          onClick={() => handleSendMessage("Spindle chiller E-304 high temperature steps")}
          className="rounded border border-border-subtle bg-surface px-2.5 py-1 text-xs text-txt-primary hover:border-teal whitespace-nowrap"
        >
          CNC Spindle Alarm E-304
        </button>
        <button
          onClick={() => handleSendMessage("2000-ton hydraulic press PRV-102 relief valve chatter")}
          className="rounded border border-border-subtle bg-surface px-2.5 py-1 text-xs text-txt-primary hover:border-teal whitespace-nowrap"
        >
          PRV-102 Valve Chatter
        </button>
      </div>

      {/* Input Composer & Voice Controls */}
      <div className="border-t border-border-subtle p-3 sm:p-4 bg-surface">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          {/* Microphone Voice Button */}
          {voiceSupported && (
            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              className={`p-2.5 rounded-lg border transition-colors ${
                isRecording
                  ? "bg-danger text-white border-danger animate-pulse"
                  : "bg-elevated border-border-subtle text-txt-muted hover:text-txt-primary"
              }`}
              title={isRecording ? "Stop recording voice" : "Speak question"}
            >
              {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>
          )}

          {/* Voice Stop/Repeat Controls */}
          {isSpeaking && (
            <button
              type="button"
              onClick={stopSpeaking}
              className="p-2.5 rounded-lg border border-border-subtle bg-elevated text-warning"
              title={t("chat.stopSpeaking")}
            >
              <VolumeX className="h-4 w-4" />
            </button>
          )}

          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder={
              isRecording ? t("chat.recording") : t("chat.placeholder")
            }
            className="flex-1 rounded-lg border border-border-subtle bg-elevated/40 px-4 py-2.5 text-sm text-txt-primary focus:outline-none focus:border-teal"
          />

          <button
            type="submit"
            disabled={!inputMessage.trim() || loading}
            className="rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:opacity-90 disabled:opacity-40 transition-opacity flex items-center gap-1.5"
          >
            <span>{t("chat.send")}</span>
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>

      {/* Citations Slide-Over Drawer */}
      <CitationsDrawer
        citation={activeCitation}
        onClose={() => setActiveCitation(null)}
      />
    </div>
  );
}
