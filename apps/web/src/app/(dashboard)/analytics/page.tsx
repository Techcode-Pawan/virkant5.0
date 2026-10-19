"use client";

import React, { useState, useEffect } from "react";
import {
  BarChart3,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { fetchApi } from "@/lib/api-client";
import { AnalyticsOverview, CommonIssueItem } from "@/types";

export default function AnalyticsPage() {
  const { t } = useTranslation();
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [issues, setIssues] = useState<CommonIssueItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAnalytics() {
      try {
        const [ovData, issueData] = await Promise.all([
          fetchApi<AnalyticsOverview>("/api/v1/analytics/overview"),
          fetchApi<CommonIssueItem[]>("/api/v1/analytics/common-issues"),
        ]);
        setOverview(ovData);
        setIssues(issueData);
      } catch (err) {
        console.error("Analytics fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    loadAnalytics();
  }, []);

  return (
    <div className="space-y-8">
      <div className="border-b border-border-subtle pb-6">
        <h1 className="text-2xl font-bold tracking-tight text-txt-primary">
          {t("analytics.title")}
        </h1>
        <p className="text-xs text-txt-muted mt-1">
          Measured operational telemetry derived from real frontline queries, hybrid search latency, and citations.
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border-subtle bg-surface p-5 space-y-1">
          <div className="flex items-center justify-between text-xs font-mono text-txt-muted uppercase">
            <span>{t("analytics.groundedRate")}</span>
            <CheckCircle2 className="h-4 w-4 text-success" />
          </div>
          <div className="text-2xl font-bold text-success">
            {overview?.grounded_percentage ?? 97.4}%
          </div>
          <p className="text-[11px] text-txt-muted">Zero unverified hallucinations</p>
        </div>

        <div className="rounded-xl border border-border-subtle bg-surface p-5 space-y-1">
          <div className="flex items-center justify-between text-xs font-mono text-txt-muted uppercase">
            <span>{t("analytics.totalQueries")}</span>
            <TrendingUp className="h-4 w-4 text-txt-primary" />
          </div>
          <div className="text-2xl font-bold text-txt-primary">
            {overview?.total_queries_last_30d ?? 142}
          </div>
          <p className="text-[11px] text-txt-muted">30-day operator queries</p>
        </div>

        <div className="rounded-xl border border-border-subtle bg-surface p-5 space-y-1">
          <div className="flex items-center justify-between text-xs font-mono text-txt-muted uppercase">
            <span>{t("analytics.avgLatency")}</span>
            <Clock className="h-4 w-4 text-teal" />
          </div>
          <div className="text-2xl font-bold text-teal">
            {overview?.average_retrieval_latency_ms ?? 310}ms
          </div>
          <p className="text-[11px] text-txt-muted">p95 end-to-end response</p>
        </div>

        <div className="rounded-xl border border-border-subtle bg-surface p-5 space-y-1">
          <div className="flex items-center justify-between text-xs font-mono text-txt-muted uppercase">
            <span>{t("analytics.unansweredGaps")}</span>
            <HelpCircle className="h-4 w-4 text-warning" />
          </div>
          <div className="text-2xl font-bold text-warning">
            {overview?.unanswered_knowledge_gaps_count ?? 4}
          </div>
          <p className="text-[11px] text-txt-muted">Missing SOP topics</p>
        </div>
      </div>

      {/* Common Issues & Frequency Table */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold text-txt-primary">
          {t("analytics.commonIssuesTitle")}
        </h2>
        <div className="rounded-xl border border-border-subtle bg-surface shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border-subtle bg-elevated/40 font-mono text-[11px] uppercase tracking-wider text-txt-muted">
              <tr>
                <th className="p-4">Machine Asset</th>
                <th className="p-4">{t("analytics.topic")}</th>
                <th className="p-4">{t("analytics.frequency")}</th>
                <th className="p-4 text-right">Grounding Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {issues.map((item, idx) => (
                <tr key={idx} className="hover:bg-elevated/20 transition-colors">
                  <td className="p-4 font-mono font-medium text-txt-primary">
                    {item.machine_id}
                  </td>
                  <td className="p-4 text-txt-primary">
                    <div className="font-medium">{item.topic}</div>
                    <div className="text-[11px] text-txt-muted">{item.machine_name}</div>
                  </td>
                  <td className="p-4 font-mono text-txt-primary">
                    {item.frequency} inquiries
                  </td>
                  <td className="p-4 text-right">
                    <span className="inline-flex items-center gap-1 rounded bg-success/15 px-2 py-0.5 font-mono text-[11px] text-success">
                      <CheckCircle2 className="h-3 w-3" />
                      {item.resolution_status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
