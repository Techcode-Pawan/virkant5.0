import React from "react";
import type { VoiceState } from "@/hooks/use-voice-session";
import { cx } from "@/components/ui/primitives";

export const VOICE_STATE_LABEL: Record<VoiceState, string> = {
  unsupported: "Voice not supported in this browser",
  idle: "Idle",
  "requesting-permission": "Waiting for microphone permission",
  listening: "Listening",
  processing: "Processing",
  speaking: "Speaking",
  reconnecting: "Reconnecting",
  error: "Voice stopped",
};

const DOT: Record<VoiceState, string> = {
  unsupported: "bg-txt-faint",
  idle: "bg-txt-faint",
  "requesting-permission": "bg-warning",
  listening: "bg-success",
  processing: "bg-accent",
  speaking: "bg-straw",
  reconnecting: "bg-warning",
  error: "bg-danger",
};

/** Compact state indicator. The dot breathes only while the microphone is live. */
export default function VoiceStatus({ state, className = "" }: { state: VoiceState; className?: string }) {
  const live = state === "listening";
  return (
    <span role="status" aria-live="polite" className={cx("inline-flex items-center gap-2 text-sm", className)}>
      <span className="relative flex h-2.5 w-2.5">
        {live && <span className={cx("absolute inline-flex h-full w-full animate-ping rounded-full opacity-50", DOT[state])} />}
        <span className={cx("relative inline-flex h-2.5 w-2.5 rounded-full", DOT[state])} />
      </span>
      <span className="text-txt-primary">{VOICE_STATE_LABEL[state]}</span>
    </span>
  );
}
