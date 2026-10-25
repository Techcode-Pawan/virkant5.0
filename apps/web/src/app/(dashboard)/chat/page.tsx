"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
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
  Layers,
  Upload,
  Zap,
  Image as ImageIcon,
  X,
  Activity,
  ArrowRight,
} from "lucide-react";
import CitationsDrawer from "@/components/chat/CitationsDrawer";
import { useVoice } from "@/hooks/use-voice";
import { useTranslation } from "@/lib/i18n";
import { useSession } from "@/lib/session";
import { fetchApi } from "@/lib/api-client";
import { siteConfig } from "@/lib/config";
import { ChatMessage, Citation, Machine, AIModelCode } from "@/types";

const DEFAULT_FALLBACK_MACHINES: Machine[] = [
  { id: "PMP-402", name: "High-Pressure Boiler Feed Pump", manufacturer: "Flowserve", model: "HPX-150-B", plant_location: "Boiler House 2, Bay C" },
  { id: "CNC-MILL-02", name: "5-Axis Precision Machining Center", manufacturer: "Okuma", model: "MU-5000V", plant_location: "Machining Cell 4" },
  { id: "HYD-PRESS-01", name: "2000-Ton Hydraulic Forging Press", manufacturer: "Schuler", model: "HP-2000-M", plant_location: "Heavy Forging Bay 1" },
  { id: "ROB-CELL-01", name: "Heavy Robotic Handling Cell", manufacturer: "KUKA", model: "KR-500", plant_location: "Bay C-4 Forge Line" },
];

function ChatConsoleInner() {
  const searchParams = useSearchParams();
  const machineParam = searchParams?.get("machine") || "";

  const { t, locale } = useTranslation();
  const { session, activeWorkspaceId, selectedModel, setSelectedModel } = useSession();
  const {
    isRecording,
    isSpeaking,
    transcript,
    isSupported: voiceSupported,
    startRecording,
    stopRecording,
    speakText,
    stopSpeaking,
  } = useVoice(locale);

  const [inputMessage, setInputMessage] = useState("");
  const [selectedMachine, setSelectedMachine] = useState<string>(machineParam);
  const [machines, setMachines] = useState<Machine[]>(DEFAULT_FALLBACK_MACHINES);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [feedbackSent, setFeedbackSent] = useState<Record<string, number>>({});
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [processingStage, setProcessingStage] = useState<string>("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync voice transcript to input
  useEffect(() => {
    if (transcript) {
      setInputMessage(transcript);
    }
  }, [transcript]);

  // Sync URL query param to machine selector
  useEffect(() => {
    if (machineParam) {
      setSelectedMachine(machineParam);
    }
  }, [machineParam]);

  // Load machine list with graceful offline fallback
  useEffect(() => {
    let isMounted = true;
    async function loadMachines() {
      try {
        const data = await fetchApi<Machine[]>("/api/v1/machines");
        if (isMounted && Array.isArray(data) && data.length > 0) {
          setMachines(data);
        }
      } catch {
        if (isMounted) {
          setMachines(DEFAULT_FALLBACK_MACHINES);
        }
      }
    }
    loadMachines();
    return () => {
      isMounted = false;
    };
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
              ? `नमस्ते! मैं ForgeWise AI हूँ, आपका प्रमाणित औद्योगिक ज्ञान सहायक। आपका सुरक्षित वर्कस्पेस [${activeWorkspaceId}] सक्रिय है। आप अपने अपलोड किए गए SOPs, OEM मैनुअल्स या उपकरणों के बारे में कोई भी प्रश्न पूछ सकते हैं।`
              : `Welcome to ForgeWise AI. I am your grounded precision industrial copilot. Your isolated workspace [${activeWorkspaceId}] is active. Ask me any maintenance procedure, torque specification, or diagnostic step from your uploaded manuals.`,
          groundedness_status: "supported",
          model_used: selectedModel,
          latency_ms: 65,
          created_at: new Date().toISOString(),
        },
      ]);
    }
  }, [locale, messages.length, activeWorkspaceId, selectedModel]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setAttachedImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSendMessage = async (queryText?: string) => {
    const textToSend = queryText || inputMessage;
    if ((!textToSend.trim() && !attachedImage) || loading) return;

    const userContent = attachedImage
      ? `${textToSend.trim() || "Diagnose this industrial alarm / equipment component photo"} [Attached Image]`
      : textToSend.trim();

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      conversation_id: "active",
      sender: "user",
      content: userContent,
      workspace_id: activeWorkspaceId,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage("");
    const sentImage = attachedImage;
    setAttachedImage(null);
    setLoading(true);

    // Live processing activity timeline
    setProcessingStage("Searching manual & vector embeddings...");
    const t1 = setTimeout(() => {
      setProcessingStage("Cross-referencing verified page sections...");
    }, 450);
    const t2 = setTimeout(() => {
      setProcessingStage(`Synthesizing grounded response via ${selectedModel}...`);
    }, 950);

    try {
      const response = await fetchApi<any>("/api/v1/chat", {
        method: "POST",
        body: JSON.stringify({
          message: textToSend.trim() || "Diagnose this attached industrial photo",
          language: locale,
          machine_id: selectedMachine || undefined,
          model: selectedModel,
          workspace_id: activeWorkspaceId,
          image_data: sentImage || undefined,
        }),
      });

      const assistantMsg: ChatMessage = {
        id: `ast-${Date.now()}`,
        conversation_id: response.conversation_id,
        sender: "assistant",
        content: response.answer,
        groundedness_status: response.confidence_status,
        citations: response.citations,
        model_used: response.model_used || selectedModel,
        latency_ms: response.latency_ms || 110,
        workspace_id: response.workspace_id || activeWorkspaceId,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMsg]);

      // If voice recording was used, read answer
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
          "Unable to retrieve verified documentation from knowledge engine. Please check backend connectivity.",
        groundedness_status: "insufficient_evidence",
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      clearTimeout(t1);
      clearTimeout(t2);
      setLoading(false);
      setProcessingStage("");
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
      console.warn("Feedback submit handled offline:", err);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8.5rem)] min-h-[550px] rounded-2xl border border-border-subtle bg-surface shadow-lg overflow-hidden transition-colors">
      {/* Chat Header & Equipment Filter */}
      <div className="border-b border-border-subtle bg-elevated/40 px-4 py-3 sm:px-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <h2 className="font-bold text-sm text-txt-primary flex items-center gap-2">
              <span>{t("nav.chat")}</span>
              <span className="flex items-center gap-1 text-[10px] font-mono text-success rounded bg-success/15 px-2 py-0.5 border border-success/30 font-semibold">
                <CheckCircle2 className="h-3 w-3" /> Grounded RAG
              </span>
            </h2>
          </div>
          <div className="hidden sm:flex items-center gap-1 text-[11px] text-txt-muted font-mono border-l border-border-subtle pl-3">
            <Layers className="h-3 w-3 text-teal" />
            <span>Workspace: {activeWorkspaceId}</span>
          </div>
        </div>

        {/* Multi-LLM Model & Equipment Selectors */}
        <div className="flex items-center gap-2">
          {/* LLM Model Dropdown */}
          <div className="flex items-center gap-1 rounded-lg border border-teal/30 bg-teal/5 px-2.5 py-1">
            <Sparkles className="h-3.5 w-3.5 text-teal shrink-0" />
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value as AIModelCode)}
              className="bg-transparent text-xs font-mono font-semibold text-teal focus:outline-none cursor-pointer"
            >
              {siteConfig.supportedModels.map((m) => (
                <option key={m.id} value={m.id} className="bg-surface text-txt-primary font-sans">
                  {m.name} ({m.badge})
                </option>
              ))}
            </select>
          </div>

          {/* Machine Asset Filter Selector */}
          <div className="flex items-center gap-1.5">
            <Cpu className="h-4 w-4 text-txt-muted hidden sm:inline" />
            <select
              value={selectedMachine}
              onChange={(e) => setSelectedMachine(e.target.value)}
              className="rounded-lg border border-border-subtle bg-surface px-2.5 py-1 text-xs text-txt-primary focus:outline-none focus:border-teal font-mono"
            >
              <option value="">{t("chat.allMachines")}</option>
              {machines.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.id} • {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* Custom SOP link */}
          <Link
            href="/documents"
            className="hidden md:flex items-center gap-1.5 rounded-lg bg-elevated px-2.5 py-1 border border-border-subtle text-[11px] font-mono text-txt-muted hover:text-txt-primary hover:border-teal/40 transition-colors"
            title="Upload custom SOP manual to this workspace"
          >
            <Upload className="h-3 w-3 text-teal" />
            <span>Upload SOP</span>
          </Link>
        </div>
      </div>

      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
        {messages.map((msg) => {
          const isUser = msg.sender === "user";
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
            >
              <div
                className={`max-w-2xl rounded-2xl p-4 sm:p-5 text-sm leading-relaxed shadow-sm transition-all ${
                  isUser
                    ? "bg-brand text-white rounded-br-none"
                    : "bg-surface border border-border-subtle text-txt-primary rounded-bl-none hover:border-teal/30"
                }`}
              >
                {/* Assistant Grounding, Model badge & Controls */}
                {!isUser && (
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-border-subtle pb-2">
                    <div className="flex items-center gap-2 text-xs font-mono">
                      {msg.groundedness_status === "supported" ? (
                        <span className="flex items-center gap-1 text-success font-semibold">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Strictly Grounded</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-amber-500 font-semibold">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          <span>No Verified Manual Record</span>
                        </span>
                      )}

                      {msg.model_used && (
                        <span className="rounded bg-teal/15 px-2 py-0.5 text-[10px] text-teal border border-teal/20 font-bold uppercase">
                          {msg.model_used}
                        </span>
                      )}

                      {msg.latency_ms && (
                        <span className="text-[10px] text-txt-muted">
                          {msg.latency_ms}ms
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => copyToClipboard(msg.id, msg.content)}
                        className="p-1.5 rounded text-txt-muted hover:text-txt-primary hover:bg-elevated transition-colors"
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
                        className="p-1.5 rounded text-txt-muted hover:text-txt-primary hover:bg-elevated transition-colors"
                        title={t("chat.repeatSpeech")}
                      >
                        <Volume2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Message Body */}
                <div className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                  {msg.content}
                </div>

                {/* Clickable Citation Chips */}
                {!isUser && msg.citations && msg.citations.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-border-subtle space-y-2">
                    <span className="font-mono text-[11px] uppercase tracking-wider text-txt-muted block font-semibold">
                      {t("chat.citationsHeader")} (Click to inspect source):
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {msg.citations.map((c, idx) => (
                        <button
                          key={c.citation_id || idx}
                          onClick={() => setActiveCitation(c)}
                          className="flex items-center gap-1.5 rounded-lg border border-teal/30 bg-teal/5 px-2.5 py-1 text-xs font-mono text-teal hover:border-teal hover:bg-teal/15 transition-all shadow-xs"
                          title={`Open ${c.document_title} at page ${c.page_number}`}
                        >
                          <FileText className="h-3.5 w-3.5" />
                          <span className="font-semibold">
                            {c.document_title?.split(" ")[0]} p.{c.page_number}
                          </span>
                          {c.section_title && (
                            <span className="text-[10px] text-txt-muted hidden sm:inline">
                              • {c.section_title.substring(0, 24)}...
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Operator Feedback Buttons */}
                {!isUser && msg.id !== "welcome-1" && (
                  <div className="mt-3 flex items-center justify-between text-xs text-txt-muted pt-2 border-t border-border-subtle/50">
                    <span>{t("chat.feedbackPrompt")}</span>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleFeedback(msg.id, 1)}
                        className={`p-1 rounded transition-colors ${
                          feedbackSent[msg.id] === 1 ? "text-success font-bold" : "hover:text-txt-primary"
                        }`}
                        title="Helpful & Accurate"
                      >
                        <ThumbsUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleFeedback(msg.id, -1)}
                        className={`p-1 rounded transition-colors ${
                          feedbackSent[msg.id] === -1 ? "text-rose-500 font-bold" : "hover:text-txt-primary"
                        }`}
                        title="Unhelpful or Inaccurate"
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

        {/* Live Processing Activity Timeline */}
        {loading && (
          <div className="flex items-center space-x-3 rounded-xl border border-teal/30 bg-teal/5 p-4 text-xs font-mono text-teal animate-in fade-in max-w-md">
            <span className="h-3 w-3 rounded-full bg-teal animate-ping shrink-0" />
            <div className="space-y-0.5">
              <div className="font-semibold">{processingStage || "Processing query..."}</div>
              <div className="text-[10px] text-txt-muted">
                Isolated Workspace: {activeWorkspaceId} • Multi-LLM RAG Engine
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Diagnostics Bar */}
      <div className="border-t border-border-subtle bg-elevated/30 px-4 py-2.5 flex items-center gap-2 overflow-x-auto text-xs">
        <span className="font-mono text-[10px] uppercase tracking-wider text-txt-muted whitespace-nowrap font-semibold">
          Quick Diagnostics:
        </span>
        <button
          onClick={() => handleSendMessage("What is the seal gland torque for pump PMP-402?")}
          className="rounded-lg border border-border-subtle bg-surface px-3 py-1.5 text-xs text-txt-primary hover:border-teal hover:bg-surface/80 whitespace-nowrap transition-colors shadow-xs"
        >
          🔧 PMP-402 Torque Specs
        </button>
        <button
          onClick={() => handleSendMessage("Spindle chiller E-304 high temperature steps")}
          className="rounded-lg border border-border-subtle bg-surface px-3 py-1.5 text-xs text-txt-primary hover:border-teal hover:bg-surface/80 whitespace-nowrap transition-colors shadow-xs"
        >
          ⚠️ CNC Spindle Alarm E-304
        </button>
        <button
          onClick={() => handleSendMessage("2000-ton hydraulic press PRV-102 relief valve chatter")}
          className="rounded-lg border border-border-subtle bg-surface px-3 py-1.5 text-xs text-txt-primary hover:border-teal hover:bg-surface/80 whitespace-nowrap transition-colors shadow-xs"
        >
          ⚙️ PRV-102 Valve Chatter
        </button>
      </div>

      {/* Image Preview Thumbnail if attached */}
      {attachedImage && (
        <div className="border-t border-border-subtle bg-elevated/40 px-4 py-2 flex items-center gap-3">
          <div className="relative h-12 w-12 rounded-lg overflow-hidden border border-border-subtle">
            <img src={attachedImage} alt="Fault visual preview" className="h-full w-full object-cover" />
            <button
              onClick={() => setAttachedImage(null)}
              className="absolute top-0.5 right-0.5 rounded-full bg-black/70 p-0.5 text-white hover:bg-black"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
          <span className="text-xs font-mono text-txt-muted">
            Equipment image attached. Type question or press Send for automated visual diagnosis.
          </span>
        </div>
      )}

      {/* Input Composer, Voice, Image Upload Controls */}
      <div className="border-t border-border-subtle p-3 sm:p-4 bg-surface">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          {/* Hidden Image Input */}
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            className="hidden"
            onChange={handleImageSelect}
          />

          {/* Image Upload Trigger */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 rounded-xl border border-border-subtle bg-elevated text-txt-muted hover:text-txt-primary hover:border-teal/40 transition-colors"
            title="Attach equipment photo / error code image"
          >
            <ImageIcon className="h-4 w-4" />
          </button>

          {/* Microphone Voice Button */}
          {voiceSupported && (
            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              className={`p-2.5 rounded-xl border transition-colors ${
                isRecording
                  ? "bg-rose-500 text-white border-rose-500 animate-pulse"
                  : "bg-elevated border-border-subtle text-txt-muted hover:text-txt-primary hover:border-teal/40"
              }`}
              title={isRecording ? "Stop recording voice" : "Speak question in English or Hindi"}
            >
              {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>
          )}

          {/* Voice Stop Controls */}
          {isSpeaking && (
            <button
              type="button"
              onClick={stopSpeaking}
              className="p-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-500"
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
            className="flex-1 rounded-xl border border-border-subtle bg-elevated/40 px-4 py-2.5 text-sm text-txt-primary focus:outline-none focus:border-teal focus:bg-surface transition-colors"
          />

          <button
            type="submit"
            disabled={(!inputMessage.trim() && !attachedImage) || loading}
            className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-40 transition-all flex items-center gap-2"
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

export default function ChatConsolePage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-96 items-center justify-center rounded-2xl border border-border-subtle bg-surface font-mono text-xs text-txt-muted">
          <span className="h-2 w-2 rounded-full bg-teal animate-ping mr-2" />
          <span>Initializing ForgeWise AI Assistant...</span>
        </div>
      }
    >
      <ChatConsoleInner />
    </Suspense>
  );
}
