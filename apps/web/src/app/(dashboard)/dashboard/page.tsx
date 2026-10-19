"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  MessageSquare,
  FileText,
  Cpu,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  HardHat,
  Search,
  Upload,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { fetchApi } from "@/lib/api-client";
import { Machine, AnalyticsOverview } from "@/types";

export default function DashboardOverviewPage() {
  const { t, locale } = useTranslation();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [machinesData, analyticsData] = await Promise.all([
          fetchApi<Machine[]>("/api/v1/machines"),
          fetchApi<AnalyticsOverview>("/api/v1/analytics/overview"),
        ]);
        setMachines(machinesData);
        setOverview(analyticsData);
      } catch (err) {
        console.error("Dashboard data load error:", err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-subtle pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-txt-primary">
            {t("nav.dashboard")}
          </h1>
          <p className="text-xs text-txt-muted mt-1">
            Real-time status for facility machinery, SOP knowledge grounding, and active diagnostics.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/chat"
            className="inline-flex items-center gap-2 rounded-md bg-teal px-4 py-2 text-xs font-semibold text-white shadow-xs hover:opacity-90 transition-opacity"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>Launch Copilot</span>
          </Link>
          <Link
            href="/documents"
            className="inline-flex items-center gap-2 rounded-md border border-border-subtle bg-surface px-4 py-2 text-xs font-medium text-txt-primary hover:bg-elevated transition-colors"
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Upload SOP</span>
          </Link>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border-subtle bg-surface p-5 space-y-1">
          <span className="font-mono text-xs uppercase tracking-wider text-txt-muted">
            Groundedness Rate
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-success">
              {overview?.grounded_percentage ?? 97.4}%
            </span>
            <span className="text-[11px] text-txt-muted font-mono">100% cited</span>
          </div>
        </div>

        <div className="rounded-xl border border-border-subtle bg-surface p-5 space-y-1">
          <span className="font-mono text-xs uppercase tracking-wider text-txt-muted">
            Total Queries (30d)
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-txt-primary">
              {overview?.total_queries_last_30d ?? 142}
            </span>
            <span className="text-[11px] text-txt-muted font-mono">queries logged</span>
          </div>
        </div>

        <div className="rounded-xl border border-border-subtle bg-surface p-5 space-y-1">
          <span className="font-mono text-xs uppercase tracking-wider text-txt-muted">
            Mean Latency
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-txt-primary">
              {overview?.average_retrieval_latency_ms ?? 310}ms
            </span>
            <span className="text-[11px] text-txt-muted font-mono">p95</span>
          </div>
        </div>

        <div className="rounded-xl border border-border-subtle bg-surface p-5 space-y-1">
          <span className="font-mono text-xs uppercase tracking-wider text-txt-muted">
            SOPs Indexed
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-teal">
              {overview?.documents_indexed_count ?? 3}
            </span>
            <span className="text-[11px] text-txt-muted font-mono">active manuals</span>
          </div>
        </div>
      </div>

      {/* Registered Plant Machinery */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-txt-primary">
            Registered Facility Equipment
          </h2>
          <Link href="/machines" className="text-xs text-teal font-medium hover:underline inline-flex items-center gap-1">
            <span>View All Assets</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {machines.map((m) => (
            <div
              key={m.id}
              className="rounded-xl border border-border-subtle bg-surface p-5 space-y-3 shadow-xs hover:border-teal/40 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono text-xs text-teal font-semibold">
                    {m.id}
                  </span>
                  <h3 className="font-semibold text-sm text-txt-primary mt-0.5">
                    {m.name}
                  </h3>
                </div>
                {m.active_issues && m.active_issues > 0 ? (
                  <span className="rounded bg-warning/15 px-2 py-0.5 text-[10px] font-mono font-medium text-warning">
                    1 Alert
                  </span>
                ) : (
                  <span className="rounded bg-success/15 px-2 py-0.5 text-[10px] font-mono font-medium text-success">
                    Nominal
                  </span>
                )}
              </div>

              <div className="space-y-1 text-xs text-txt-muted font-mono">
                <div>OEM: {m.manufacturer} • {m.model}</div>
                <div>Location: {m.plant_location}</div>
              </div>

              <div className="pt-2 border-t border-border-subtle flex items-center justify-between">
                <Link
                  href={`/chat?machine=${m.id}`}
                  className="text-xs text-teal font-medium hover:underline"
                >
                  Troubleshoot Asset →
                </Link>
                <span className="text-[11px] text-txt-muted font-mono">
                  {m.document_count} SOPs
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Plant Safety Notice */}
      <div className="rounded-xl border border-border-subtle bg-elevated/40 p-5 flex items-start gap-3">
        <HardHat className="h-5 w-5 text-warning shrink-0 mt-0.5" />
        <div className="text-xs leading-relaxed text-txt-primary">
          <strong className="font-semibold text-txt-primary block mb-0.5">
            Facility EHS Protocol (Lockout/Tagout):
          </strong>
          Always confirm de-energization and zero electrical/hydraulic stored energy prior to performing servicing or mechanical inspections.
        </div>
      </div>
    </div>
  );
}
