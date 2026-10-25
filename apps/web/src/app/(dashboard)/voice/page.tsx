"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Mic, MicOff, Send, SlidersHorizontal, VolumeX } from "lucide-react";
import AIEmblem3D, { EmblemState } from "@/components/brand/Emblem";
import MessageView from "@/components/chat/MessageView";
import CitationsDrawer from "@/components/chat/CitationsDrawer";
import { cx, InlineAlert } from "@/components/ui/primitives";
import VoiceStatus from "@/components/voice/VoiceStatus";
import { useConversation } from "@/hooks/use-conversation";
import {
  DEFAULT_VOICE_SETTINGS,
  loadVoiceSettings,
  saveVoiceSettings,
  useVoiceSession,
  VoiceSettings,
} from "@/hooks/use-voice-session";
import { MODE_LABEL } from "@/lib/chat";
import { siteConfig } from "@/lib/config";
import { useTranslation } from "@/lib/i18n";
import type { ChatMode, Citation, LanguageCode } from "@/types";

const IDLE_OPTIONS = [
  { value: 0, label: "Never (until I stop it)" },
  { value: 5 * 60_000, label: "After 5 minutes of silence" },
  { value: 15 * 60_000, label: "After 15 minutes of silence" },
  { value: 30 * 60_000, label: "After 30 minutes of silence" },
];

export default function VoiceAssistantPage() {
  const { locale, setLocale } = useTranslation();
  const convo = useConversation();
  const [mode, setMode] = useState<ChatMode>("grounded");
  const [settings, setSettings] = useState<VoiceSettings>(DEFAULT_VOICE_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  const [typed, setTyped] = useState("");
  const [citation, setCitation] = useState<Citation | null>(null);

  useEffect(() => setSettings(loadVoiceSettings()), []);

  const updateSettings = (patch: Partial<VoiceSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveVoiceSettings(next);
      return next;
    });
  };

  const voice = useVoiceSession({
    lang: locale,
    settings,
    onUtterance: async (text, { signal }) => {
      const { response, error } = await convo.send(text, { mode, language: locale, voice: true, signal });
      if (error) throw error;
      return response?.answer ?? null;
    },
  });

  const emblemState: EmblemState = useMemo(() => {
    if (voice.state === "listening") return "listening";
    if (voice.state === "processing") return "processing";
    if (voice.state === "speaking") return "speaking";
    return "idle";
  }, [voice.state]);

  const lastPair = useMemo(() => convo.messages.slice(-2), [convo.messages]);
  const active = voice.sessionActive;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
      <section className="flex flex-col items-center">
        <div className="relative aspect-square w-full max-w-[380px]">
          <AIEmblem3D state={emblemState} label={`Voice assistant: ${voice.state}`} />
        </div>

        <div className="mt-2 flex flex-col items-center gap-3 text-center">
          <VoiceStatus state={voice.state} />
          <p className="min-h-[1.5rem] max-w-xl text-sm text-txt-muted">
            {voice.state === "listening" && (voice.interim || "Go ahead, I'm listening.")}
            {voice.state === "processing" && `“${voice.lastUtterance}”`}
            {voice.state === "speaking" && "Reading the answer. Press stop to interrupt."}
            {voice.state === "reconnecting" && "The speech service dropped; reconnecting automatically."}
            {voice.state === "idle" && !voice.notice && "Start a session and talk hands-free. It keeps listening between questions until you end it."}
            {voice.state === "idle" && voice.notice}
            {voice.state === "unsupported" && "This browser has no speech recognition. Use Chrome, Edge or Safari, or type below."}
          </p>

          <div className="flex items-center gap-2">
            {voice.recognitionSupported && (
              <button
                onClick={() => (active ? voice.stop() : voice.start())}
                className={cx("btn h-11 px-5 text-[0.9375rem]", active ? "btn-secondary" : "btn-primary")}
                aria-pressed={active}
              >
                {active ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                {active ? "End session" : "Start voice session"}
              </button>
            )}
            {voice.state === "speaking" && (
              <button onClick={voice.interrupt} className="btn-secondary h-11 px-4">
                <VolumeX className="h-4 w-4" /> Stop speaking
              </button>
            )}
          </div>
        </div>

        {voice.error && (
          <InlineAlert tone="danger" className="mt-5 w-full max-w-xl" action={<button onClick={voice.clearError} className="btn-ghost h-7 px-2 text-xs">Dismiss</button>}>
            {voice.error}
          </InlineAlert>
        )}

        {/* Typed fallback: same pipeline, works without a microphone */}
        <form
          className="mt-6 flex w-full max-w-xl items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!typed.trim()) return;
            voice.submitText(typed);
            setTyped("");
          }}
        >
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            className="field h-10"
            placeholder="Or type a question"
            aria-label="Type a question"
          />
          <button type="submit" className="btn-secondary h-10 px-3" disabled={!typed.trim() || voice.state === "processing"} aria-label="Send">
            <Send className="h-4 w-4" />
          </button>
        </form>

        {lastPair.length > 0 && (
          <div className="mt-8 w-full max-w-2xl space-y-5 border-t border-border-subtle pt-6">
            {lastPair.map((m) => (
              <MessageView key={m.id} message={m} onCitation={setCitation} onSpeak={voice.ttsSupported ? voice.speakOnly : undefined} />
            ))}
            {convo.conversationId && (
              <Link href={`/chat?c=${convo.conversationId}`} className="inline-block text-sm text-accent hover:underline">
                Open full conversation in chat ({convo.messages.length} messages)
              </Link>
            )}
          </div>
        )}
      </section>

      <aside className="space-y-5 lg:border-l lg:border-border-subtle lg:pl-8">
        <div>
          <p className="text-sm font-medium">Answer mode</p>
          <div role="radiogroup" className="mt-2 grid grid-cols-2 gap-1 rounded-md border border-border-subtle bg-base/50 p-0.5">
            {(["grounded", "general"] as ChatMode[]).map((m) => (
              <button
                key={m}
                role="radio"
                aria-checked={mode === m}
                onClick={() => setMode(m)}
                className={cx("rounded px-2 py-1.5 text-sm", mode === m ? "bg-elevated text-txt-primary" : "text-txt-muted hover:text-txt-primary")}
              >
                {MODE_LABEL[m]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label" htmlFor="voice-lang">Speech language</label>
          <select id="voice-lang" className="field" value={locale} onChange={(e) => setLocale(e.target.value as LanguageCode)}>
            {siteConfig.supportedLanguages.map((l) => (
              <option key={l} value={l}>{siteConfig.languageNames[l]}</option>
            ))}
          </select>
        </div>

        <div>
          <button onClick={() => setShowSettings((s) => !s)} className="flex items-center gap-2 text-sm font-medium text-txt-primary" aria-expanded={showSettings}>
            <SlidersHorizontal className="h-4 w-4 text-txt-muted" /> Listening behaviour
          </button>
          {showSettings && (
            <div className="mt-3 space-y-4">
              <div>
                <label className="label" htmlFor="silence">
                  End of question after {(settings.silenceMs / 1000).toFixed(1)} s of silence
                </label>
                <input
                  id="silence"
                  type="range"
                  min={800}
                  max={4000}
                  step={100}
                  value={settings.silenceMs}
                  onChange={(e) => updateSettings({ silenceMs: Number(e.target.value) })}
                  className="w-full accent-accent"
                />
                <p className="mt-1 text-xs text-txt-faint">Longer helps if you pause mid-sentence.</p>
              </div>
              <div>
                <label className="label" htmlFor="idle">End the session</label>
                <select id="idle" className="field" value={settings.idleTimeoutMs} onChange={(e) => updateSettings({ idleTimeoutMs: Number(e.target.value) })}>
                  {IDLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <label className="flex items-start gap-2.5 text-sm">
                <input type="checkbox" className="mt-0.5" checked={settings.autoSpeak} onChange={(e) => updateSettings({ autoSpeak: e.target.checked })} />
                <span>Read answers aloud</span>
              </label>
              <label className="flex items-start gap-2.5 text-sm">
                <input type="checkbox" className="mt-0.5" checked={settings.bargeIn} onChange={(e) => updateSettings({ bargeIn: e.target.checked })} />
                <span>
                  Let me interrupt by speaking
                  <span className="block text-xs text-txt-faint">Use with headphones; speakers can trigger it.</span>
                </span>
              </label>
            </div>
          )}
        </div>

        <div className="border-t border-border-subtle pt-4 text-xs leading-relaxed text-txt-faint">
          Speech recognition runs in your browser (Chrome and Edge send audio to their speech service). Sessions restart automatically when the browser ends them and stop only when you end them, on a permission or microphone error, or after the idle limit you set.
        </div>
      </aside>

      <CitationsDrawer citation={citation} onClose={() => setCitation(null)} />
    </div>
  );
}
