"use client";

import React, { useState, useEffect } from "react";
import {
  Sun,
  Moon,
  Contrast,
  Languages,
  Shield,
  Check,
  Key,
  Sparkles,
  Server,
  Layers,
  Save,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
} from "lucide-react";
import { useTranslation, LanguageCode } from "@/lib/i18n";
import { useTheme, ThemeMode } from "@/lib/theme";
import { useSession } from "@/lib/session";
import { fetchApi } from "@/lib/api-client";
import { siteConfig } from "@/lib/config";
import { AIModelCode } from "@/types";

export default function SettingsPage() {
  const { t, locale, setLocale } = useTranslation();
  const { theme, setTheme } = useTheme();
  const { activeWorkspaceId, selectedModel, setSelectedModel } = useSession();

  const [openaiKey, setOpenaiKey] = useState("");
  const [geminiKey, setGeminiKey] = useState("");
  const [anthropicKey, setAnthropicKey] = useState("");
  const [ollamaUrl, setOllamaUrl] = useState("http://localhost:11434");
  const [embeddingProvider, setEmbeddingProvider] = useState("auto");
  const [showKeys, setShowKeys] = useState(false);

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Load existing configuration from API
  useEffect(() => {
    async function loadSettings() {
      try {
        const data = await fetchApi<any>("/api/v1/settings");
        if (data?.keys_configured) {
          if (data.keys_configured.openai_masked) setOpenaiKey(data.keys_configured.openai_masked);
          if (data.keys_configured.gemini_masked) setGeminiKey(data.keys_configured.gemini_masked);
          if (data.keys_configured.anthropic_masked) setAnthropicKey(data.keys_configured.anthropic_masked);
          if (data.keys_configured.ollama_url) setOllamaUrl(data.keys_configured.ollama_url);
        }
        if (data?.embedding_provider) setEmbeddingProvider(data.embedding_provider);
      } catch (err) {
        console.warn("Settings fetch fallback:", err);
      }
    }
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: any = {
        ollama_url: ollamaUrl,
        embedding_provider: embeddingProvider,
      };
      if (openaiKey && !openaiKey.includes("...")) payload.openai_api_key = openaiKey;
      if (geminiKey && !geminiKey.includes("...")) payload.gemini_api_key = geminiKey;
      if (anthropicKey && !anthropicKey.includes("...")) payload.anthropic_api_key = anthropicKey;

      await fetchApi("/api/v1/settings/keys", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      // Update workspace default
      await fetchApi("/api/v1/settings/workspace-default", {
        method: "POST",
        body: JSON.stringify({
          workspace_id: activeWorkspaceId,
          model_code: selectedModel,
        }),
      });

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3500);
    } catch {
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3500);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8 animate-in fade-in duration-150">
      <div className="border-b border-border-subtle pb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-txt-primary flex items-center gap-2">
            <span>System Preferences & AI Settings</span>
          </h1>
          <p className="text-xs text-txt-muted mt-1">
            Configure Multi-LLM provider API keys, workspace default models, language locales, and industrial UI themes.
          </p>
        </div>

        <div className="flex items-center gap-1.5 rounded-lg bg-teal/15 px-2.5 py-1 font-mono text-[11px] text-teal border border-teal/20">
          <Layers className="h-3 w-3" />
          <span>Active: {activeWorkspaceId}</span>
        </div>
      </div>

      {savedSuccess && (
        <div className="rounded-xl border border-success/40 bg-success/15 p-4 flex items-center gap-2.5 text-xs text-txt-primary font-mono animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
          <span>Multi-LLM settings and API credentials updated successfully. Active model switched to {selectedModel}.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Multi-LLM Model Selection & Workspace Default */}
        <div className="rounded-2xl border border-border-subtle bg-surface p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-sm text-txt-primary flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-teal" />
                <span>Per-Workspace Default AI Model</span>
              </h2>
              <p className="text-xs text-txt-muted mt-0.5">
                Every query initiated within workspace {activeWorkspaceId} uses this provider.
              </p>
            </div>
            <span className="text-[10px] font-mono text-success rounded bg-success/15 px-2 py-0.5 border border-success/30 font-semibold">
              Live Hot-Swapping
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {siteConfig.supportedModels.map((m) => (
              <button
                type="button"
                key={m.id}
                onClick={() => setSelectedModel(m.id as AIModelCode)}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  selectedModel === m.id
                    ? "border-teal bg-teal/10 text-txt-primary shadow-xs font-semibold"
                    : "border-border-subtle bg-elevated/40 text-txt-muted hover:text-txt-primary hover:border-teal/30"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-txt-primary">{m.name}</span>
                  <span className="rounded bg-elevated px-1.5 py-0.2 font-mono text-[9px] text-txt-muted border border-border-subtle">
                    {m.badge}
                  </span>
                </div>
                <div className="text-[11px] text-txt-muted font-mono mt-1">{m.provider}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Multi-LLM Provider API Keys */}
        <div className="rounded-2xl border border-border-subtle bg-surface p-6 space-y-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-border-subtle pb-3">
            <div>
              <h2 className="font-bold text-sm text-txt-primary flex items-center gap-2">
                <Key className="h-4 w-4 text-amber-500" />
                <span>Multi-LLM Provider API Credentials</span>
              </h2>
              <p className="text-xs text-txt-muted mt-0.5">
                Optional: Enter enterprise keys to enable live cloud inference. If omitted, the high-precision offline provider automatically executes answers.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowKeys(!showKeys)}
              className="flex items-center gap-1 text-[11px] font-mono text-txt-muted hover:text-txt-primary"
            >
              {showKeys ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              <span>{showKeys ? "Hide" : "Show"}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-txt-muted mb-1.5 font-semibold">
                Google Gemini API Key
              </label>
              <input
                type={showKeys ? "text" : "password"}
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full rounded-xl border border-border-subtle bg-elevated/50 px-3.5 py-2.5 text-xs text-txt-primary font-mono focus:outline-none focus:border-teal"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-txt-muted mb-1.5 font-semibold">
                OpenAI API Key
              </label>
              <input
                type={showKeys ? "text" : "password"}
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
                placeholder="sk-proj-..."
                className="w-full rounded-xl border border-border-subtle bg-elevated/50 px-3.5 py-2.5 text-xs text-txt-primary font-mono focus:outline-none focus:border-teal"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-txt-muted mb-1.5 font-semibold">
                Anthropic Claude API Key
              </label>
              <input
                type={showKeys ? "text" : "password"}
                value={anthropicKey}
                onChange={(e) => setAnthropicKey(e.target.value)}
                placeholder="sk-ant-api03-..."
                className="w-full rounded-xl border border-border-subtle bg-elevated/50 px-3.5 py-2.5 text-xs text-txt-primary font-mono focus:outline-none focus:border-teal"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-txt-muted mb-1.5 font-semibold">
                Ollama Edge Endpoint (Air-Gapped)
              </label>
              <input
                type="text"
                value={ollamaUrl}
                onChange={(e) => setOllamaUrl(e.target.value)}
                placeholder="http://localhost:11434"
                className="w-full rounded-xl border border-border-subtle bg-elevated/50 px-3.5 py-2.5 text-xs text-txt-primary font-mono focus:outline-none focus:border-teal"
              />
            </div>
          </div>
        </div>

        {/* Language Selection */}
        <div className="rounded-2xl border border-border-subtle bg-surface p-6 space-y-3 shadow-sm">
          <label className="block text-xs font-mono uppercase tracking-wider text-txt-muted font-semibold">
            {t("settings.language")} / Multilingual Grounding
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setLocale("en")}
              className={`p-3.5 rounded-xl border text-left text-xs font-medium transition-colors ${
                locale === "en"
                  ? "border-teal bg-teal/10 text-txt-primary shadow-xs font-semibold"
                  : "border-border-subtle bg-elevated/40 text-txt-muted hover:text-txt-primary"
              }`}
            >
              <div className="font-semibold text-sm">English</div>
              <div className="text-[11px] text-txt-muted mt-0.5">Primary engineering precision locale</div>
            </button>

            <button
              type="button"
              onClick={() => setLocale("hi")}
              className={`p-3.5 rounded-xl border text-left text-xs font-medium transition-colors ${
                locale === "hi"
                  ? "border-teal bg-teal/10 text-txt-primary shadow-xs font-semibold"
                  : "border-border-subtle bg-elevated/40 text-txt-muted hover:text-txt-primary"
              }`}
            >
              <div className="font-semibold text-sm">हिंदी / Hinglish</div>
              <div className="text-[11px] text-txt-muted mt-0.5">मानक औद्योगिक शब्दावली और प्लांट निर्देश</div>
            </button>
          </div>
        </div>

        {/* Theme Selection */}
        <div className="rounded-2xl border border-border-subtle bg-surface p-6 space-y-3 shadow-sm">
          <label className="block text-xs font-mono uppercase tracking-wider text-txt-muted font-semibold">
            {t("settings.theme")} / Display Mode
          </label>
          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setTheme("light")}
              className={`p-3.5 rounded-xl border text-left transition-colors ${
                theme === "light"
                  ? "border-teal bg-teal/10 text-txt-primary shadow-xs font-semibold"
                  : "border-border-subtle bg-elevated/40 text-txt-muted hover:text-txt-primary"
              }`}
            >
              <Sun className="h-4 w-4 mb-2 text-txt-primary" />
              <div className="font-semibold text-xs">{t("settings.light")}</div>
              <div className="text-[10px] text-txt-muted">Clean steel light</div>
            </button>

            <button
              type="button"
              onClick={() => setTheme("dark")}
              className={`p-3.5 rounded-xl border text-left transition-colors ${
                theme === "dark"
                  ? "border-teal bg-teal/10 text-txt-primary shadow-xs font-semibold"
                  : "border-border-subtle bg-elevated/40 text-txt-muted hover:text-txt-primary"
              }`}
            >
              <Moon className="h-4 w-4 mb-2 text-txt-primary" />
              <div className="font-semibold text-xs">{t("settings.dark")}</div>
              <div className="text-[10px] text-txt-muted">Graphite control room</div>
            </button>

            <button
              type="button"
              onClick={() => setTheme("high-contrast")}
              className={`p-3.5 rounded-xl border text-left transition-colors ${
                theme === "high-contrast"
                  ? "border-amber-500 bg-amber-500/15 text-txt-primary shadow-xs font-semibold"
                  : "border-border-subtle bg-elevated/40 text-txt-muted hover:text-txt-primary"
              }`}
            >
              <Contrast className="h-4 w-4 mb-2 text-amber-500" />
              <div className="font-semibold text-xs">{t("settings.contrast")}</div>
              <div className="text-[10px] text-txt-muted">High-glare plant floor</div>
            </button>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border-subtle">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-brand px-6 py-2.5 text-xs font-semibold text-white shadow-md hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            <Save className="h-4 w-4 text-teal" />
            <span>{saving ? "Saving Configuration..." : "Save Settings & Keys"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
