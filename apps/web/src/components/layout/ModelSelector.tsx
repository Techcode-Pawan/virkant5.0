"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, ChevronDown } from "lucide-react";
import { cx, StatusDot } from "@/components/ui/primitives";
import { PROVIDER_STATE_LABEL, useLLMStatus } from "@/lib/llm-status";
import { useSession } from "@/lib/session";
import type { ProviderState } from "@/types";

/** Offline extractive mode is a degraded fallback, never shown as a healthy green model. */
export function providerTone(p?: { id: string; state: ProviderState | string } | null) {
  return p?.id === "offline" ? ("warning" as const) : stateTone(p?.state);
}

export function stateTone(state?: ProviderState | string) {
  switch (state) {
    case "ready":
      return "success" as const;
    case "unverified":
      return "accent" as const;
    case "degraded":
    case "unavailable":
      return "warning" as const;
    case "error":
      return "danger" as const;
    default:
      return "neutral" as const;
  }
}

export default function ModelSelector({ compact = false }: { compact?: boolean }) {
  const { models, providers, defaultModel, loaded } = useLLMStatus();
  const { selectedModel, setSelectedModel } = useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const effectiveId = selectedModel || defaultModel;
  const effective = models.find((m) => m.id === effectiveId);
  const provider = providers.find((p) => p.id === effective?.provider);
  const available = models.filter((m) => m.available);
  const unavailable = models.filter((m) => !m.available);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex h-9 items-center gap-2 rounded-md border border-border-subtle bg-base/40 px-2.5 text-sm text-txt-primary transition-colors hover:border-border-strong"
      >
        <StatusDot tone={providerTone(provider)} />
        <span className={cx("truncate", compact ? "max-w-[96px]" : "max-w-[160px]")}>
          {!loaded ? "Loading models" : effective?.name || effectiveId || "No model"}
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-txt-faint" />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Model"
          className="absolute right-0 z-50 mt-1.5 w-[300px] overflow-hidden rounded-lg border border-border-strong bg-surface shadow-panel"
        >
          <button
            role="option"
            aria-selected={!selectedModel}
            onClick={() => {
              setSelectedModel(null);
              setOpen(false);
            }}
            className="flex w-full items-start justify-between gap-2 border-b border-border-subtle px-3 py-2.5 text-left hover:bg-elevated"
          >
            <span>
              <span className="block text-sm text-txt-primary">Automatic</span>
              <span className="block text-xs text-txt-muted">Workspace default with fallback ({defaultModel || "—"})</span>
            </span>
            {!selectedModel && <Check className="mt-0.5 h-4 w-4 text-accent" />}
          </button>
          <div className="max-h-[320px] overflow-y-auto py-1">
            {available.map((m) => {
              const p = providers.find((x) => x.id === m.provider);
              return (
                <button
                  key={m.id}
                  role="option"
                  aria-selected={selectedModel === m.id}
                  onClick={() => {
                    setSelectedModel(m.id);
                    setOpen(false);
                  }}
                  className="flex w-full items-start justify-between gap-2 px-3 py-2 text-left hover:bg-elevated"
                >
                  <span className="min-w-0">
                    <span className="flex items-center gap-2 text-sm text-txt-primary">
                      <StatusDot tone={providerTone(p)} />
                      {m.name}
                    </span>
                    <span className="block pl-4 text-xs text-txt-muted">
                      {p?.label}: {PROVIDER_STATE_LABEL[p?.state || "not_configured"].toLowerCase()}
                    </span>
                  </span>
                  {selectedModel === m.id && <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />}
                </button>
              );
            })}
            {unavailable.length > 0 && (
              <p className="px-3 pb-2 pt-2 text-xs text-txt-faint">
                {unavailable.length} more model{unavailable.length > 1 ? "s" : ""} need an API key.{" "}
                <Link href="/models" onClick={() => setOpen(false)} className="text-accent hover:underline">
                  Configure providers
                </Link>
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
