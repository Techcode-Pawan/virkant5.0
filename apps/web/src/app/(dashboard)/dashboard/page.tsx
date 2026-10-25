"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { FileUp, MessageSquare, Mic, RefreshCw } from "lucide-react";
import AIEmblem3D from "@/components/brand/Emblem";
import { stateTone } from "@/components/layout/ModelSelector";
import { EmptyState, formatRelative, InlineAlert, SectionTitle, Skeleton, StatusDot } from "@/components/ui/primitives";
import { errorMessage, fetchApi } from "@/lib/api-client";
import { listConversations, MODE_LABEL } from "@/lib/chat";
import { PROVIDER_STATE_LABEL, useLLMStatus } from "@/lib/llm-status";
import { useSession } from "@/lib/session";
import type { AnalyticsOverview, ConversationSummary, HealthStatus, Machine } from "@/types";

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

type Load<T> = { data: T | null; error: string | null };

export default function DashboardPage() {
  const { session } = useSession();
  const { providers, defaultModel, loaded: providersLoaded, checkProvider } = useLLMStatus();
  const [recent, setRecent] = useState<Load<ConversationSummary[]>>({ data: null, error: null });
  const [stats, setStats] = useState<Load<AnalyticsOverview>>({ data: null, error: null });
  const [machines, setMachines] = useState<Load<Machine[]>>({ data: null, error: null });
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [checking, setChecking] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const settle = <T,>(p: Promise<T>, set: (v: Load<T>) => void) =>
      p.then((data) => alive && set({ data, error: null })).catch((err) => alive && set({ data: null, error: errorMessage(err) }));
    settle(listConversations(6), setRecent);
    settle(fetchApi<AnalyticsOverview>("/api/v1/analytics/overview"), setStats);
    settle(fetchApi<Machine[]>("/api/v1/machines"), setMachines);
    fetchApi<HealthStatus>("/api/v1/health").then((h) => alive && setHealth(h)).catch(() => {});
    return () => {
      alive = false;
    };
  }, [session?.workspace_id]);

  const firstName = session?.full_name?.split(" ")[0] || "";
  const llmProviders = providers.filter((p) => p.id !== "offline");
  const configuredCount = llmProviders.filter((p) => p.configured).length;
  const s = stats.data;

  return (
    <div className="space-y-10">
      {/* Hero */}
      <section className="panel relative overflow-hidden">
        <div className="grid items-center gap-6 md:grid-cols-[minmax(0,1fr)_300px] lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 p-6 sm:p-8">
            <h1 className="text-[1.75rem] font-semibold leading-tight tracking-[-0.02em]">
              {greeting()}{firstName ? `, ${firstName}` : ""}
            </h1>
            <p className="mt-2 max-w-md text-sm text-txt-muted">
              You are in <span className="text-txt-primary">{session?.workspace_name}</span>. Ask about a procedure, a fault code or a spec, and get the answer with the page it came from.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Link href="/chat" className="btn-primary h-10 px-4"><MessageSquare className="h-4 w-4" /> Ask a question</Link>
              <Link href="/voice" className="btn-secondary h-10 px-4"><Mic className="h-4 w-4" /> Start voice session</Link>
              <Link href="/documents" className="btn-ghost h-10 px-4"><FileUp className="h-4 w-4" /> Upload an SOP</Link>
            </div>
            {health && health.database.status !== "connected" && (
              <InlineAlert tone="warning" className="mt-6" title="Database unavailable">
                History and uploads cannot be saved until MongoDB reconnects.
              </InlineAlert>
            )}
          </div>
          <div className="relative h-[240px] md:h-[300px] lg:h-[340px]">
            <AIEmblem3D label="ForgeWise AI emblem" />
          </div>
        </div>
      </section>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        {/* Recent conversations */}
        <section className="min-w-0">
          <SectionTitle action={<Link href="/history" className="text-sm text-accent hover:underline">View all</Link>}>
            Recent conversations
          </SectionTitle>
          <div className="panel divide-y divide-border-subtle">
            {recent.data === null && !recent.error && (
              <div className="space-y-3 p-4">
                {[0, 1, 2].map((i) => <Skeleton key={i} className="h-10" />)}
              </div>
            )}
            {recent.error && <div className="p-4"><InlineAlert tone="danger">{recent.error}</InlineAlert></div>}
            {recent.data?.length === 0 && (
              <EmptyState
                icon={MessageSquare}
                title="No conversations yet"
                description="Questions you ask by chat or voice are saved here."
                action={<Link href="/chat" className="btn-secondary h-8">Ask the first question</Link>}
              />
            )}
            {recent.data?.map((c) => (
              <Link key={c.id} href={`/chat?c=${c.id}`} className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-elevated/40">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-txt-primary">{c.title}</p>
                  <p className="mt-0.5 text-xs text-txt-faint">
                    {MODE_LABEL[c.mode] || c.mode}
                    {c.machine_id ? `, ${c.machine_id}` : ""}, {c.message_count} messages
                  </p>
                </div>
                <span className="shrink-0 text-xs text-txt-faint">{formatRelative(c.updated_at)}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* AI providers */}
        <section className="min-w-0">
          <SectionTitle action={<Link href="/models" className="text-sm text-accent hover:underline">Manage</Link>}>
            AI providers
          </SectionTitle>
          <div className="panel">
            <div className="divide-y divide-border-subtle">
              {!providersLoaded && <div className="p-4"><Skeleton className="h-24" /></div>}
              {llmProviders.map((p) => (
                <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                  <StatusDot tone={stateTone(p.state)} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-txt-primary">{p.label}</p>
                    <p className="truncate text-xs text-txt-faint" title={p.last_error || undefined}>
                      {PROVIDER_STATE_LABEL[p.state]}
                      {p.state === "ready" && p.last_success_at ? `, last success ${formatRelative(p.last_success_at)}` : ""}
                    </p>
                  </div>
                  {p.configured && (
                    <button
                      onClick={async () => {
                        setChecking(p.id);
                        await checkProvider(p.id);
                        setChecking(null);
                      }}
                      disabled={checking === p.id}
                      className="btn-ghost h-7 px-2 text-xs"
                      aria-label={`Check ${p.label}`}
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${checking === p.id ? "animate-spin" : ""}`} /> Check
                    </button>
                  )}
                </div>
              ))}
            </div>
            {providersLoaded && (
              <p className="border-t border-border-subtle px-4 py-3 text-xs text-txt-muted">
                {configuredCount === 0
                  ? "No AI provider configured. Answers are quoted from your documents (offline mode) until you add a key."
                  : `Default model: ${defaultModel}. Other configured providers take over automatically if it fails.`}
              </p>
            )}
          </div>
        </section>
      </div>

      {/* Usage */}
      <section>
        <SectionTitle>Last 30 days</SectionTitle>
        {stats.error && <InlineAlert tone="danger">{stats.error}</InlineAlert>}
        {!stats.error && !s && <Skeleton className="h-20" />}
        {s && s.total_queries_last_30d === 0 && (
          <p className="text-sm text-txt-muted">Usage figures appear here after the first questions are asked in this organization.</p>
        )}
        {s && s.total_queries_last_30d > 0 && (
          <dl className="panel grid grid-cols-2 divide-border-subtle sm:grid-cols-3 lg:grid-cols-5 lg:divide-x">
            {[
              { label: "Questions asked", value: s.total_queries_last_30d.toLocaleString() },
              { label: "Answered from documents", value: `${s.grounded_percentage}%` },
              { label: "Not covered by documents", value: s.unanswered_knowledge_gaps_count.toLocaleString() },
              { label: "Average response time", value: s.average_retrieval_latency_ms ? `${(s.average_retrieval_latency_ms / 1000).toFixed(1)} s` : "n/a" },
              { label: "Documents indexed", value: s.documents_indexed_count.toLocaleString() },
            ].map((item) => (
              <div key={item.label} className="px-5 py-4">
                <dt className="text-xs text-txt-muted">{item.label}</dt>
                <dd className="mt-1 text-xl font-semibold tabular-nums tracking-[-0.01em]">{item.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      {/* Equipment shortcuts */}
      <section>
        <SectionTitle action={<Link href="/machines" className="text-sm text-accent hover:underline">All equipment</Link>}>
          Equipment
        </SectionTitle>
        {machines.error && <InlineAlert tone="danger">{machines.error}</InlineAlert>}
        {machines.data && machines.data.length === 0 && <p className="text-sm text-txt-muted">No equipment registered yet.</p>}
        {machines.data && machines.data.length > 0 && (
          <div className="panel overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-border-subtle text-left text-xs text-txt-muted">
                  <th className="px-4 py-2.5 font-medium">Equipment</th>
                  <th className="px-4 py-2.5 font-medium">Location</th>
                  <th className="px-4 py-2.5 font-medium">Documents</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {machines.data.slice(0, 6).map((m) => (
                  <tr key={m.id}>
                    <td className="px-4 py-3">
                      <span className="code-id text-txt-muted">{m.id}</span>
                      <span className="ml-2 text-txt-primary">{m.name}</span>
                    </td>
                    <td className="px-4 py-3 text-txt-muted">{m.plant_location || "Not set"}</td>
                    <td className="px-4 py-3 tabular-nums text-txt-muted">{m.document_count ?? 0}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/chat?machine=${encodeURIComponent(m.id)}`} className="text-accent hover:underline">Ask about it</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
