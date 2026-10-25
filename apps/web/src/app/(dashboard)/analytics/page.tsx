"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { Badge, EmptyState, InlineAlert, PageHeader, SectionTitle, Skeleton } from "@/components/ui/primitives";
import { errorMessage, fetchApi } from "@/lib/api-client";
import type { AnalyticsOverview, CommonIssueItem } from "@/types";

export default function AnalyticsPage() {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [issues, setIssues] = useState<CommonIssueItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetchApi<AnalyticsOverview>("/api/v1/analytics/overview"),
      fetchApi<CommonIssueItem[]>("/api/v1/analytics/common-issues"),
    ])
      .then(([o, i]) => {
        setOverview(o);
        setIssues(i);
      })
      .catch((err) => setError(errorMessage(err)));
  }, []);

  const o = overview;
  const answered = o ? o.assistant_answers_last_30d : 0;
  const groundedCount = o ? Math.round((o.grounded_percentage / 100) * answered) : 0;

  return (
    <div className="space-y-10">
      <PageHeader title="Analytics" description="Computed from stored conversations and documents in this organization over the last 30 days." />
      {error && <InlineAlert tone="danger">{error}</InlineAlert>}
      {!o && !error && <Skeleton className="h-32" />}

      {o && o.total_queries_last_30d === 0 && (
        <div className="panel">
          <EmptyState icon={BarChart3} title="No activity yet" description="Figures appear once people start asking questions." action={<Link href="/chat" className="btn-secondary h-8">Open chat</Link>} />
        </div>
      )}

      {o && o.total_queries_last_30d > 0 && (
        <>
          <section className="grid gap-6 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            <div className="panel p-6">
              <p className="text-sm text-txt-muted">Answers backed by your documents</p>
              <p className="mt-1 text-[2.5rem] font-semibold leading-none tracking-[-0.02em] tabular-nums">{o.grounded_percentage}%</p>
              <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-elevated" role="img" aria-label={`${groundedCount} of ${answered} answers grounded`}>
                <div className="h-full rounded-full bg-success" style={{ width: `${Math.min(100, o.grounded_percentage)}%` }} />
              </div>
              <p className="mt-2 text-xs text-txt-faint">{groundedCount} of {answered} answers cited an uploaded document.</p>
            </div>
            <dl className="panel grid grid-cols-2 divide-x divide-y divide-border-subtle">
              {[
                { label: "Questions asked", value: o.total_queries_last_30d },
                { label: "Not covered by documents", value: o.unanswered_knowledge_gaps_count },
                { label: "Average response time", value: o.average_retrieval_latency_ms ? `${(o.average_retrieval_latency_ms / 1000).toFixed(1)} s` : "n/a" },
                { label: "Active users", value: o.active_operators_count },
              ].map((s) => (
                <div key={s.label} className="px-5 py-4">
                  <dt className="text-xs text-txt-muted">{s.label}</dt>
                  <dd className="mt-1 text-xl font-semibold tabular-nums">{s.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section>
            <SectionTitle>Most-asked equipment</SectionTitle>
            {issues && issues.length === 0 && <p className="text-sm text-txt-muted">No questions were scoped to a specific machine yet.</p>}
            {issues && issues.length > 0 && (
              <div className="panel overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead>
                    <tr className="border-b border-border-subtle text-left text-xs text-txt-muted">
                      <th className="px-4 py-2.5 font-medium">Equipment</th>
                      <th className="px-4 py-2.5 font-medium">Latest topic</th>
                      <th className="px-4 py-2.5 font-medium">Answers</th>
                      <th className="px-4 py-2.5 font-medium">Coverage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {issues.map((i) => (
                      <tr key={i.machine_id}>
                        <td className="px-4 py-3"><span className="code-id mr-2 text-txt-muted">{i.machine_id}</span>{i.machine_name}</td>
                        <td className="max-w-[280px] truncate px-4 py-3 text-txt-muted">{i.topic}</td>
                        <td className="px-4 py-3 tabular-nums">{i.frequency}</td>
                        <td className="px-4 py-3"><Badge tone={i.resolution_status === "Knowledge gap" ? "warning" : "success"}>{i.resolution_status}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="mt-2 text-xs text-txt-faint">A knowledge gap means at least one question about that machine had no matching document. Upload the missing manual to close it.</p>
          </section>
        </>
      )}
    </div>
  );
}
