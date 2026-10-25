"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { InlineAlert, PageHeader, SectionTitle, Spinner } from "@/components/ui/primitives";
import { errorMessage, fetchApi } from "@/lib/api-client";
import { siteConfig } from "@/lib/config";
import { useTranslation } from "@/lib/i18n";
import { useLLMStatus } from "@/lib/llm-status";
import { useSession } from "@/lib/session";
import { ThemeMode, useTheme } from "@/lib/theme";
import type { ChatMode, LanguageCode } from "@/types";

interface ServerSettings {
  keys_configured: Record<string, { configured: boolean; source: "env" | "runtime" | "none" }>;
  ollama: { configured: boolean; base_url: string | null };
  can_edit_keys: boolean;
  preferences: { preferred_language?: LanguageCode; theme?: ThemeMode; chat_mode?: ChatMode };
}

const KEY_FIELDS = [
  { id: "gemini", field: "gemini_api_key", label: "Google Gemini API key" },
  { id: "openai", field: "openai_api_key", label: "OpenAI API key" },
  { id: "anthropic", field: "anthropic_api_key", label: "Anthropic API key" },
];

const SOURCE_LABEL = { env: "Set in server .env", runtime: "Set for this server session", none: "Not set" };

export default function SettingsPage() {
  const { session } = useSession();
  const { locale, setLocale } = useTranslation();
  const { theme, setTheme } = useTheme();
  const { refresh } = useLLMStatus();
  const [server, setServer] = useState<ServerSettings | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [chatMode, setChatMode] = useState<ChatMode>("grounded");
  const [prefStatus, setPrefStatus] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [savingKeys, setSavingKeys] = useState(false);
  const [keyStatus, setKeyStatus] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  const load = () =>
    fetchApi<ServerSettings>("/api/v1/settings")
      .then((s) => {
        setServer(s);
        if (s.preferences.chat_mode) setChatMode(s.preferences.chat_mode);
      })
      .catch((err) => setLoadError(errorMessage(err)));

  useEffect(() => {
    load();
    try {
      const m = localStorage.getItem("forgewise_chat_mode");
      if (m === "general" || m === "grounded") setChatMode(m);
    } catch {
      /* ignore */
    }
  }, []);

  const savePreference = async (patch: Partial<ServerSettings["preferences"]>) => {
    setPrefStatus(null);
    try {
      await fetchApi("/api/v1/settings/preferences", { method: "PUT", body: JSON.stringify(patch) });
      setPrefStatus({ tone: "success", text: "Preferences saved to your account." });
    } catch (err) {
      setPrefStatus({ tone: "danger", text: `Saved on this device only: ${errorMessage(err)}` });
    }
  };

  const saveKeys = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = Object.fromEntries(Object.entries(keys).filter(([, v]) => v.trim() !== ""));
    if (!Object.keys(payload).length) return;
    setSavingKeys(true);
    setKeyStatus(null);
    try {
      await fetchApi("/api/v1/settings/keys", { method: "POST", body: JSON.stringify(payload) });
      setKeys({});
      setKeyStatus({ tone: "success", text: "Saved in server memory. They are lost when the API restarts; put them in apps/api/.env to keep them." });
      await load();
      refresh();
    } catch (err) {
      setKeyStatus({ tone: "danger", text: errorMessage(err) });
    } finally {
      setSavingKeys(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-10">
      <PageHeader title="Settings" />
      {loadError && <InlineAlert tone="danger">{loadError}</InlineAlert>}

      <section>
        <SectionTitle>Preferences</SectionTitle>
        <div className="panel divide-y divide-border-subtle">
          <div className="grid gap-2 px-5 py-4 sm:grid-cols-[200px_1fr] sm:items-center">
            <label htmlFor="pref-lang" className="text-sm text-txt-primary">Language</label>
            <select
              id="pref-lang"
              className="field max-w-xs"
              value={locale}
              onChange={(e) => {
                const lang = e.target.value as LanguageCode;
                setLocale(lang);
                savePreference({ preferred_language: lang });
              }}
            >
              {siteConfig.supportedLanguages.map((l) => <option key={l} value={l}>{siteConfig.languageNames[l]}</option>)}
            </select>
          </div>
          <div className="grid gap-2 px-5 py-4 sm:grid-cols-[200px_1fr] sm:items-center">
            <span className="text-sm text-txt-primary">Theme</span>
            <div className="flex flex-wrap gap-2">
              {([["dark", "Dark"], ["light", "Light"], ["high-contrast", "High contrast"]] as [ThemeMode, string][]).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => {
                    setTheme(id);
                    savePreference({ theme: id });
                  }}
                  aria-pressed={theme === id}
                  className={theme === id ? "btn-secondary h-8 border-accent/60" : "btn-ghost h-8"}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-2 px-5 py-4 sm:grid-cols-[200px_1fr] sm:items-center">
            <label htmlFor="pref-mode" className="text-sm text-txt-primary">Default answer mode</label>
            <div>
              <select
                id="pref-mode"
                className="field max-w-xs"
                value={chatMode}
                onChange={(e) => {
                  const mode = e.target.value as ChatMode;
                  setChatMode(mode);
                  try {
                    localStorage.setItem("forgewise_chat_mode", mode);
                  } catch {
                    /* ignore */
                  }
                  savePreference({ chat_mode: mode });
                }}
              >
                <option value="grounded">Documents only</option>
                <option value="general">General assistant</option>
              </select>
              <p className="mt-1 text-xs text-txt-faint">Documents only refuses questions your SOPs don&apos;t cover.</p>
            </div>
          </div>
          <div className="grid gap-2 px-5 py-4 sm:grid-cols-[200px_1fr] sm:items-center">
            <span className="text-sm text-txt-primary">Voice</span>
            <p className="text-sm text-txt-muted">
              Silence window, auto-stop and barge-in are set on the <Link href="/voice" className="text-accent hover:underline">voice assistant</Link> page and stored on this device.
            </p>
          </div>
        </div>
        {prefStatus && <p className={`mt-2 text-xs ${prefStatus.tone === "danger" ? "text-danger" : "text-txt-faint"}`}>{prefStatus.text}</p>}
      </section>

      <section>
        <SectionTitle>AI provider keys</SectionTitle>
        <p className="mb-3 text-sm text-txt-muted">
          Keys are stored on the backend only and never sent back to the browser. The durable way to configure them is apps/api/.env. See <Link href="/models" className="text-accent hover:underline">AI models</Link> for live status.
        </p>
        {server && (
          <form onSubmit={saveKeys} className="panel divide-y divide-border-subtle">
            {KEY_FIELDS.map((k) => (
              <div key={k.id} className="grid gap-2 px-5 py-4 sm:grid-cols-[200px_1fr] sm:items-center">
                <div>
                  <label htmlFor={k.field} className="text-sm text-txt-primary">{k.label}</label>
                  <p className="text-xs text-txt-faint">{SOURCE_LABEL[server.keys_configured[k.id]?.source || "none"]}</p>
                </div>
                <input
                  id={k.field}
                  type="password"
                  autoComplete="off"
                  disabled={!server.can_edit_keys}
                  placeholder={server.keys_configured[k.id]?.configured ? "Configured. Enter a new key to replace it." : "Paste a key"}
                  value={keys[k.field] || ""}
                  onChange={(e) => setKeys((prev) => ({ ...prev, [k.field]: e.target.value }))}
                  className="field"
                />
              </div>
            ))}
            <div className="grid gap-2 px-5 py-4 sm:grid-cols-[200px_1fr] sm:items-center">
              <div>
                <label htmlFor="ollama_url" className="text-sm text-txt-primary">Ollama URL</label>
                <p className="text-xs text-txt-faint">{server.ollama.configured ? `Using ${server.ollama.base_url}` : "Not set"}</p>
              </div>
              <input
                id="ollama_url"
                type="url"
                disabled={!server.can_edit_keys}
                placeholder="http://127.0.0.1:11434"
                value={keys.ollama_url || ""}
                onChange={(e) => setKeys((prev) => ({ ...prev, ollama_url: e.target.value }))}
                className="field"
              />
            </div>
            <div className="flex items-center justify-end gap-3 px-5 py-3">
              {!server.can_edit_keys && <span className="mr-auto text-xs text-txt-faint">Only organization admins can change keys.</span>}
              <button type="submit" disabled={!server.can_edit_keys || savingKeys || !Object.values(keys).some((v) => v.trim())} className="btn-primary">
                {savingKeys && <Spinner />} Save for this session
              </button>
            </div>
          </form>
        )}
        {keyStatus && <InlineAlert tone={keyStatus.tone} className="mt-3">{keyStatus.text}</InlineAlert>}
      </section>

      <section>
        <SectionTitle>Account</SectionTitle>
        <dl className="panel grid grid-cols-[140px_1fr] gap-y-2 px-5 py-4 text-sm">
          <dt className="text-txt-muted">Name</dt><dd>{session?.full_name}</dd>
          <dt className="text-txt-muted">E-mail</dt><dd className="truncate">{session?.email}</dd>
          <dt className="text-txt-muted">Role</dt><dd className="capitalize">{session?.role.replace("_", " ")}</dd>
          <dt className="text-txt-muted">Workspace</dt><dd className="truncate">{session?.workspace_name}</dd>
          <dt className="text-txt-muted">Organization</dt><dd className="truncate">{session?.organization_name}</dd>
        </dl>
      </section>
    </div>
  );
}
