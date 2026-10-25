"use client";

import React, { useEffect, useState } from "react";
import { Check, RefreshCw } from "lucide-react";
import { stateTone } from "@/components/layout/ModelSelector";
import { Badge, cx, formatRelative, InlineAlert, PageHeader, SectionTitle, Spinner, StatusDot } from "@/components/ui/primitives";
import { errorMessage, fetchApi } from "@/lib/api-client";
import { PROVIDER_STATE_LABEL, useLLMStatus } from "@/lib/llm-status";
import { useSession } from "@/lib/session";

const ENV_HINT: Record<string, string> = {
  gemini: "GEMINI_API_KEY (free tier at aistudio.google.com)",
  openai: "OPENAI_API_KEY, optionally OPENAI_BASE_URL for compatible services",
  anthropic: "ANTHROPIC_API_KEY",
  ollama: "OLLAMA_BASE_URL=http://127.0.0.1:11434 and OLLAMA_MODEL (free, local)",
  offline: "LLM_OFFLINE_FALLBACK=true",
};

export default function ModelsPage() {
  const { providers, models, defaultModel, fallbackChain, refresh, checkProvider, error } = useLLMStatus();
  const { session, selectedModel, setSelectedModel } = useSession();
  const [checking, setChecking] = useState<string | null>(null);
  const [workspaceDefault, setWorkspaceDefault] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  useEffect(() => {
    fetchApi<{ workspace_default_model: string | null }>("/api/v1/settings")
      .then((s) => setWorkspaceDefault(s.workspace_default_model))
      .catch(() => {});
  }, [session?.workspace_id]);

  const saveWorkspaceDefault = async (model: string | null) => {
    setSaving(true);
    setSaveMsg(null);
    try {
      await fetchApi("/api/v1/settings/workspace-default", { method: "POST", body: JSON.stringify({ model_code: model }) });
      setWorkspaceDefault(model);
      setSaveMsg({ tone: "success", text: model ? `Workspace default set to ${model}.` : "Workspace default reset to the server default." });
      refresh();
    } catch (err) {
      setSaveMsg({ tone: "danger", text: errorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-10">
      <PageHeader
        title="AI models"
        description="Which providers are configured on the server, how they are doing, and the order they are tried in. API keys live only in the backend's environment."
      />
      {error && <InlineAlert tone="danger">{error}</InlineAlert>}

      <section>
        <SectionTitle>Providers</SectionTitle>
        <div className="panel divide-y divide-border-subtle">
          {providers.map((p) => (
            <div key={p.id} className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:gap-4">
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <StatusDot tone={stateTone(p.state)} className="mt-1.5" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-txt-primary">{p.label}</p>
                  <p className="text-xs text-txt-muted">
                    {PROVIDER_STATE_LABEL[p.state]}
                    {p.last_success_at && `. Last success ${formatRelative(p.last_success_at)}`}
                    {p.cooldown_seconds > 0 && `. Skipped for ${Math.ceil(p.cooldown_seconds)} s after errors`}
                  </p>
                  {p.last_error && p.state !== "ready" && <p className="mt-1 text-xs text-danger">{p.last_error}</p>}
                  {!p.configured && <p className="mt-1 text-xs text-txt-faint">Set {ENV_HINT[p.id]} in apps/api/.env</p>}
                </div>
              </div>
              <div className="flex items-center gap-2 pl-5 sm:pl-0">
                {p.default_model && <span className="code-id text-txt-faint">{p.default_model}</span>}
                {p.configured && p.id !== "offline" && (
                  <button
                    onClick={async () => {
                      setChecking(p.id);
                      await checkProvider(p.id);
                      setChecking(null);
                    }}
                    disabled={checking === p.id}
                    className="btn-secondary h-8 px-2.5 text-xs"
                  >
                    <RefreshCw className={cx("h-3.5 w-3.5", checking === p.id && "animate-spin")} /> Test connection
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle>Fallback order</SectionTitle>
        <p className="mb-3 max-w-2xl text-sm text-txt-muted">
          Each request tries these in order. Temporary failures (timeouts, rate limits, outages) are retried up to twice with backoff before moving on; invalid keys move on immediately.
        </p>
        <ol className="panel divide-y divide-border-subtle">
          {fallbackChain.map((id, i) => {
            const m = models.find((x) => x.id === id);
            return (
              <li key={id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <span className="w-5 text-right tabular-nums text-txt-faint">{i + 1}</span>
                <span className="text-txt-primary">{m?.name || id}</span>
                {!m?.available && <Badge>not configured</Badge>}
              </li>
            );
          })}
        </ol>
        <p className="mt-2 text-xs text-txt-faint">Change the order with LLM_PRIMARY_MODEL and LLM_FALLBACK_MODELS.</p>
      </section>

      <section>
        <SectionTitle>Models</SectionTitle>
        {saveMsg && <InlineAlert tone={saveMsg.tone} className="mb-3">{saveMsg.text}</InlineAlert>}
        <div className="panel overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border-subtle text-left text-xs text-txt-muted">
                <th className="px-4 py-2.5 font-medium">Model</th>
                <th className="px-4 py-2.5 font-medium">Provider</th>
                <th className="px-4 py-2.5 font-medium">Context</th>
                <th className="px-4 py-2.5 font-medium">This browser</th>
                <th className="px-4 py-2.5 font-medium">Workspace default</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {models.map((m) => (
                <tr key={m.id} className={cx(!m.available && "text-txt-faint")}>
                  <td className="px-4 py-3">
                    <p className={m.available ? "text-txt-primary" : ""}>{m.name}</p>
                    <p className="text-xs text-txt-faint">{m.description}</p>
                  </td>
                  <td className="px-4 py-3 text-txt-muted">{providers.find((p) => p.id === m.provider)?.label || m.provider}</td>
                  <td className="px-4 py-3 tabular-nums text-txt-muted">{m.context_window >= 1_000_000 ? `${(m.context_window / 1_000_000).toFixed(1)}M` : `${Math.round(m.context_window / 1000)}k`}</td>
                  <td className="px-4 py-3">
                    {m.available ? (
                      <button onClick={() => setSelectedModel(selectedModel === m.id ? null : m.id)} className={cx("btn h-7 px-2 text-xs", selectedModel === m.id ? "btn-secondary" : "btn-ghost")}>
                        {selectedModel === m.id ? <><Check className="h-3.5 w-3.5" /> Selected</> : "Use"}
                      </button>
                    ) : "Needs key"}
                  </td>
                  <td className="px-4 py-3">
                    {m.available && (
                      <button
                        disabled={saving}
                        onClick={() => saveWorkspaceDefault(workspaceDefault === m.id ? null : m.id)}
                        className={cx("btn h-7 px-2 text-xs", workspaceDefault === m.id ? "btn-secondary" : "btn-ghost")}
                      >
                        {saving ? <Spinner className="h-3.5 w-3.5" /> : workspaceDefault === m.id ? <><Check className="h-3.5 w-3.5" /> Default</> : "Make default"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-txt-faint">
          Current server default: {defaultModel}. &ldquo;This browser&rdquo; overrides it for you only; the workspace default applies to everyone using this workspace.
        </p>
      </section>
    </div>
  );
}
