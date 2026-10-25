"use client";

import React, { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ImagePlus, Mic, MicOff, Plus, Send, Square, VolumeX, X } from "lucide-react";
import CitationsDrawer from "@/components/chat/CitationsDrawer";
import MessageView from "@/components/chat/MessageView";
import { cx, InlineAlert, Spinner } from "@/components/ui/primitives";
import VoiceStatus from "@/components/voice/VoiceStatus";
import { useConversation } from "@/hooks/use-conversation";
import { loadVoiceSettings, useVoiceSession, VoiceSettings } from "@/hooks/use-voice-session";
import { fetchApi } from "@/lib/api-client";
import { MODE_LABEL } from "@/lib/chat";
import { useTranslation } from "@/lib/i18n";
import type { ChatMode, Citation, Machine } from "@/types";

const SUGGESTIONS = [
  { text: "What is the seal gland bolt torque for pump PMP-402?", machine: "PMP-402" },
  { text: "Spindle chiller alarm E-304: what are the diagnostic steps?", machine: "CNC-MILL-02" },
  { text: "PRV-102 relief valve chatter on the hydraulic press: what should I check?", machine: "HYD-PRESS-01" },
];

const MODE_KEY = "forgewise_chat_mode";

function ChatConsole() {
  const params = useSearchParams();
  const router = useRouter();
  const { locale } = useTranslation();
  const convo = useConversation();
  const { messages, sending, send, stop, reset, load, lastQuestion } = convo;

  const [input, setInput] = useState("");
  const [mode, setMode] = useState<ChatMode>("grounded");
  const [machineId, setMachineId] = useState(params?.get("machine") || "");
  const [machines, setMachines] = useState<Machine[]>([]);
  const [machinesError, setMachinesError] = useState<string | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [citation, setCitation] = useState<Citation | null>(null);
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>();

  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const modeRef = useRef(mode);
  const machineRef = useRef(machineId);
  modeRef.current = mode;
  machineRef.current = machineId;

  useEffect(() => {
    setVoiceSettings(loadVoiceSettings());
    try {
      const saved = localStorage.getItem(MODE_KEY);
      if (saved === "general" || saved === "grounded") setMode(saved);
    } catch {
      /* ignore */
    }
  }, []);

  // Open a conversation from History (?c=<id>).
  const requested = params?.get("c");
  useEffect(() => {
    if (requested && requested !== convo.conversationId) load(requested);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requested]);

  useEffect(() => {
    let alive = true;
    fetchApi<Machine[]>("/api/v1/machines")
      .then((data) => alive && setMachines(data))
      .catch((err) => alive && setMachinesError(err.message));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, sending]);

  const voice = useVoiceSession({
    lang: locale,
    settings: voiceSettings,
    onUtterance: async (text, { signal }) => {
      const { response, error } = await send(text, { mode: modeRef.current, language: locale, machineId: machineRef.current, voice: true, signal });
      if (error) throw error;
      return response?.answer ?? null;
    },
  });

  const submit = useCallback(
    async (text?: string, retry = false) => {
      const message = (text ?? input).trim();
      if ((!message && !image) || sending) return;
      setInput("");
      const attached = image;
      setImage(null);
      await send(message || "Describe the attached equipment photo and any visible fault.", {
        mode,
        language: locale,
        machineId: machineRef.current, // ref: suggestions set the machine in the same tick
        imageData: attached,
        retry,
      });
      inputRef.current?.focus();
    },
    [input, image, sending, send, mode, locale],
  );

  const changeMode = (next: ChatMode) => {
    setMode(next);
    try {
      localStorage.setItem(MODE_KEY, next);
    } catch {
      /* ignore */
    }
  };

  const newChat = () => {
    voice.stop();
    reset();
    router.replace("/chat");
    inputRef.current?.focus();
  };

  const onImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    setImageError(null);
    if (!file) return;
    if (!file.type.startsWith("image/")) return setImageError("Choose a PNG, JPEG or WebP image.");
    if (file.size > 8 * 1024 * 1024) return setImageError("Images must be 8 MB or smaller.");
    const reader = new FileReader();
    reader.onload = () => setImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const voiceActive = voice.sessionActive;
  const lastFailed = messages.length > 0 && messages[messages.length - 1].failed;

  return (
    <div className="-my-6 flex h-[calc(100dvh-3.5rem)] flex-col lg:-my-8">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border-subtle py-3">
        <div role="radiogroup" aria-label="Answer mode" className="flex rounded-md border border-border-subtle bg-base/50 p-0.5">
          {(["grounded", "general"] as ChatMode[]).map((m) => (
            <button
              key={m}
              role="radio"
              aria-checked={mode === m}
              onClick={() => changeMode(m)}
              className={cx("rounded px-2.5 py-1 text-sm", mode === m ? "bg-elevated text-txt-primary" : "text-txt-muted hover:text-txt-primary")}
            >
              {MODE_LABEL[m]}
            </button>
          ))}
        </div>
        <select
          aria-label="Equipment filter"
          value={machineId}
          onChange={(e) => setMachineId(e.target.value)}
          className="field h-8 w-auto max-w-[220px] py-0 text-sm"
          title={machinesError || undefined}
        >
          <option value="">All equipment</option>
          {machines.map((m) => (
            <option key={m.id} value={m.id}>{m.id}: {m.name}</option>
          ))}
        </select>
        <button onClick={newChat} className="btn-ghost ml-auto h-8">
          <Plus className="h-4 w-4" /> New chat
        </button>
      </div>

      {/* Messages */}
      <div ref={listRef} className="flex-1 overflow-y-auto py-6" aria-live="polite">
        {convo.loadingHistory && (
          <div className="flex items-center gap-2 text-sm text-txt-muted"><Spinner /> Loading conversation</div>
        )}
        {convo.loadError && <InlineAlert tone="danger" title="Conversation unavailable">{convo.loadError}</InlineAlert>}

        {!convo.loadingHistory && messages.length === 0 && (
          <div className="mx-auto max-w-xl pt-6 sm:pt-12">
            <h1 className="text-xl font-semibold tracking-[-0.01em]">What do you need to check?</h1>
            <p className="mt-1.5 text-sm text-txt-muted">
              {mode === "grounded"
                ? "Answers come only from the SOPs and manuals in this workspace, with the page they came from."
                : "General assistant mode. Your documents are still searched and cited when they match."}
            </p>
            <div className="mt-6 divide-y divide-border-subtle rounded-lg border border-border-subtle">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.text}
                  onClick={() => {
                    setMachineId(s.machine);
                    machineRef.current = s.machine;
                    submit(s.text);
                  }}
                  className="block w-full px-4 py-3 text-left text-sm text-txt-muted transition-colors hover:bg-elevated/50 hover:text-txt-primary"
                >
                  {s.text}
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-txt-faint">Examples refer to the seeded plant equipment. Upload the matching manuals in the SOP library to get answers.</p>
          </div>
        )}

        <div className="mx-auto max-w-3xl space-y-6">
          {messages.map((m) => (
            <MessageView
              key={m.id}
              message={m}
              onCitation={setCitation}
              onSpeak={voice.ttsSupported ? voice.speakOnly : undefined}
              onRetry={m.failed && m.id === messages[messages.length - 1].id && m.errorCode !== "ABORTED" ? () => {
                const q = lastQuestion();
                if (q) submit(q, true);
              } : undefined}
            />
          ))}
          {sending && (
            <div className="flex items-center gap-2 text-sm text-txt-muted">
              <Spinner /> {mode === "grounded" ? "Searching your documents and drafting an answer" : "Drafting an answer"}
            </div>
          )}
        </div>
      </div>

      {/* Composer */}
      <div className="border-t border-border-subtle pb-4 pt-3">
        <div className="mx-auto max-w-3xl">
          {(voiceActive || voice.state === "error" || voice.error || voice.notice) && (
            <div className="mb-2 flex flex-wrap items-center gap-3 rounded-lg border border-border-subtle bg-surface px-3 py-2">
              <VoiceStatus state={voice.state} />
              {voice.interim && voice.state === "listening" && <span className="min-w-0 flex-1 truncate text-sm text-txt-muted">{voice.interim}</span>}
              <span className="ml-auto flex items-center gap-1">
                {voice.state === "speaking" && (
                  <button onClick={voice.interrupt} className="btn-ghost h-7 px-2 text-xs"><VolumeX className="h-3.5 w-3.5" /> Stop speaking</button>
                )}
                {voiceActive && <button onClick={() => voice.stop()} className="btn-ghost h-7 px-2 text-xs"><MicOff className="h-3.5 w-3.5" /> End voice</button>}
              </span>
              {(voice.error || voice.notice) && <p className="w-full text-xs text-txt-muted">{voice.error || voice.notice}</p>}
            </div>
          )}
          {image && (
            <div className="mb-2 flex items-center gap-3">
              <div className="relative h-14 w-14 overflow-hidden rounded-md border border-border-subtle">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image} alt="Attached photo" className="h-full w-full object-cover" />
                <button onClick={() => setImage(null)} aria-label="Remove image" className="absolute right-0.5 top-0.5 rounded bg-black/70 p-0.5 text-white">
                  <X className="h-3 w-3" />
                </button>
              </div>
              <p className="text-xs text-txt-muted">Photo attached. It is described only if a vision provider is configured on the server.</p>
            </div>
          )}
          {imageError && <p className="mb-2 text-xs text-danger">{imageError}</p>}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            className="flex items-end gap-2 rounded-xl border border-border-strong bg-surface p-2 focus-within:border-accent/60"
          >
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={onImage} />
            <button type="button" className="icon-btn" aria-label="Attach photo" onClick={() => fileRef.current?.click()}>
              <ImagePlus className="h-[18px] w-[18px]" />
            </button>
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = `${Math.min(e.target.scrollHeight, 180)}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder={voiceActive ? "Speak, or type here" : "Ask about an SOP, fault code or procedure"}
              aria-label="Message"
              className="max-h-[180px] min-h-[36px] flex-1 resize-none bg-transparent px-1 py-2 text-sm text-txt-primary placeholder:text-txt-faint focus:outline-none"
            />
            {voice.recognitionSupported && (
              <button
                type="button"
                onClick={() => (voiceActive ? voice.stop() : voice.start())}
                aria-pressed={voiceActive}
                aria-label={voiceActive ? "End voice conversation" : "Start voice conversation"}
                title={voiceActive ? "End voice conversation" : "Talk hands-free: it keeps listening until you end it"}
                className={cx("icon-btn", voiceActive && "bg-success/15 text-success hover:bg-success/20 hover:text-success")}
              >
                {voiceActive ? <MicOff className="h-[18px] w-[18px]" /> : <Mic className="h-[18px] w-[18px]" />}
              </button>
            )}
            {sending ? (
              <button type="button" onClick={stop} className="btn-secondary h-9 px-3" aria-label="Stop generating">
                <Square className="h-3.5 w-3.5" /> Stop
              </button>
            ) : (
              <button type="submit" disabled={!input.trim() && !image} className="btn-primary h-9 px-3" aria-label="Send">
                <Send className="h-4 w-4" />
              </button>
            )}
          </form>
          <p className="mt-1.5 text-2xs text-txt-faint">
            {lastFailed ? "The last request failed; nothing was answered. " : ""}
            {voice.recognitionSupported ? "" : "Voice input isn't available in this browser; typing works everywhere. "}
            Verify critical values against the source before acting.
          </p>
        </div>
      </div>

      <CitationsDrawer citation={citation} onClose={() => setCitation(null)} />
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="flex items-center gap-2 text-sm text-txt-muted"><Spinner /> Loading chat</div>}>
      <ChatConsole />
    </Suspense>
  );
}
