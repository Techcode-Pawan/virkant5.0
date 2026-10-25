"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { ModelInfo, ProviderStatus } from "@/types";
import { fetchApi } from "./api-client";
import { useSession } from "./session";

interface LLMStatusContextType {
  providers: ProviderStatus[];
  models: ModelInfo[];
  defaultModel: string | null;
  fallbackChain: string[];
  loaded: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  checkProvider: (id: string) => Promise<ProviderStatus | null>;
}

const LLMStatusContext = createContext<LLMStatusContextType | null>(null);

export function LLMStatusProvider({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [defaultModel, setDefaultModel] = useState<string | null>(null);
  const [fallbackChain, setFallbackChain] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [p, m] = await Promise.all([
        fetchApi<{ providers: ProviderStatus[]; primary_model: string; fallback_chain: string[] }>("/api/v1/llm/providers"),
        fetchApi<{ models: ModelInfo[]; default_model: string }>("/api/v1/llm/models"),
      ]);
      setProviders(p.providers);
      setFallbackChain(p.fallback_chain);
      setModels(m.models);
      setDefaultModel(m.default_model);
      setError(null);
    } catch (err: any) {
      setError(err?.message || "Could not load AI provider status.");
    } finally {
      setLoaded(true);
    }
  }, []);

  const checkProvider = useCallback(
    async (id: string) => {
      try {
        const result = await fetchApi<ProviderStatus>(`/api/v1/llm/providers/${id}/check`, { method: "POST", timeoutMs: 20_000 });
        setProviders((prev) => prev.map((p) => (p.id === id ? result : p)));
        return result;
      } catch {
        return null;
      }
    },
    [],
  );

  // Status is local server state (no provider calls), so a slow poll while visible is cheap.
  useEffect(() => {
    if (status !== "authenticated") return;
    refresh();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [status, refresh]);

  const value = useMemo(
    () => ({ providers, models, defaultModel, fallbackChain, loaded, error, refresh, checkProvider }),
    [providers, models, defaultModel, fallbackChain, loaded, error, refresh, checkProvider],
  );
  return <LLMStatusContext.Provider value={value}>{children}</LLMStatusContext.Provider>;
}

export function useLLMStatus() {
  const ctx = useContext(LLMStatusContext);
  if (!ctx) throw new Error("useLLMStatus must be used inside <LLMStatusProvider>");
  return ctx;
}

export const PROVIDER_STATE_LABEL: Record<string, string> = {
  ready: "Working",
  unverified: "Configured, not yet used",
  degraded: "Recent errors",
  unavailable: "Temporarily unavailable",
  error: "Configuration error",
  not_configured: "Not configured",
};
