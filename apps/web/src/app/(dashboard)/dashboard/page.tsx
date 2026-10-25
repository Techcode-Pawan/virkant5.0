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
  Sparkles,
  Zap,
  Activity,
  Layers,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { fetchApi } from "@/lib/api-client";
import { Machine, AnalyticsOverview } from "@/types";
import IndustrialHeroScene from "@/components/3d/IndustrialHeroScene";

const DEFAULT_MACHINES: Machine[] = [
  { id: "PMP-402", name: "High-Pressure Boiler Feed Pump", manufacturer: "Flowserve", model: "HPX-150-B", plant_location: "Boiler House 2, Bay C", status: "operational" },
  { id: "CNC-MILL-02", name: "5-Axis Precision Machining Center", manufacturer: "Okuma", model: "MU-5000V", plant_location: "Machining Cell 4", status: "operational" },
  { id: "HYD-PRESS-01", name: "2000-Ton Hydraulic Forging Press", manufacturer: "Schuler", model: "HP-2000-M", plant_location: "Heavy Forging Bay 1", status: "warning" },
];

export default function DashboardOverviewPage() {
  const { t, locale } = useTranslation();
  const [machines, setMachines] = useState<Machine[]>(DEFAULT_MACHINES);
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [machinesData, analyticsData] = await Promise.all([
          fetchApi<Machine[]>("/api/v1/machines"),
          fetchApi<AnalyticsOverview>("/api/v1/analytics/overview"),
        ]);
        if (Array.isArray(machinesData) && machinesData.length > 0) {
          setMachines(machinesData);
        }
        setOverview(analyticsData);
      } catch (err) {
        console.warn("Dashboard data using offline fallback:", err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-subtle pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-txt-primary flex items-center gap-2.5">
            <span>Precision Industrial Operations</span>
            <span className="rounded bg-teal/15 px-2 py-0.5 text-xs font-mono font-bold text-teal border border-teal/20">
              Live Facility Bay C-4
            </span>
          </h1>
          <p className="text-xs text-txt-muted mt-1">
            Real-time status for plant machinery, 3D digital twins, grounded SOP manuals, and multimodal diagnostics.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/chat"
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-xs font-semibold text-white shadow-sm hover:opacity-90 transition-opacity"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>Launch Copilot</span>
          </Link>
          <Link
            href="/documents"
            className="inline-flex items-center gap-2 rounded-xl border border-border-subtle bg-surface px-4 py-2 text-xs font-medium text-txt-primary hover:bg-elevated transition-colors shadow-xs"
          >
            <Upload className="h-3.5 w-3.5 text-teal" />
            <span>Upload SOP</span>
          </Link>
        </div>
      </div>

      {/* 3D Interactive Industrial Scene Hero */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-txt-muted font-semibold">
            <Activity className="h-4 w-4 text-teal" />
            <span>Interactive 3D Machine Assembly & Digital Twin</span>
          </div>
          <span className="text-[11px] font-mono text-txt-muted hidden sm:inline">
            Interactive WebGL 60 FPS • Real-Time Sensor Telemetry
          </span>
        </div>
        <IndustrialHeroScene />
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-border-subtle bg-surface p-5 space-y-1 shadow-sm hover:border-teal/30 transition-colors">
          <span className="font-mono text-xs uppercase tracking-wider text-txt-muted">
            Groundedness Rate
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-success font-mono">
              {overview?.grounded_percentage ?? 98.6}%
            </span>
            <span className="text-[11px] text-txt-muted font-mono">100% cited</span>
          </div>
        </div>

        <div className="rounded-2xl border border-border-subtle bg-surface p-5 space-y-1 shadow-sm hover:border-teal/30 transition-colors">
          <span className="font-mono text-xs uppercase tracking-wider text-txt-muted">
            Total Queries (30d)
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-txt-primary font-mono">
              {overview?.total_queries_last_30d ?? 184}
            </span>
            <span className="text-[11px] text-txt-muted font-mono">queries logged</span>
          </div>
        </div>

        <div className="rounded-2xl border border-border-subtle bg-surface p-5 space-y-1 shadow-sm hover:border-teal/30 transition-colors">
          <span className="font-mono text-xs uppercase tracking-wider text-txt-muted">
            Mean Latency
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-txt-primary font-mono">
              {overview?.average_retrieval_latency_ms ?? 115}ms
            </span>
            <span className="text-[11px] text-txt-muted font-mono">Multi-LLM RAG</span>
          </div>
        </div>

        <div className="rounded-2xl border border-border-subtle bg-surface p-5 space-y-1 shadow-sm hover:border-teal/30 transition-colors">
          <span className="font-mono text-xs uppercase tracking-wider text-txt-muted">
            SOPs Indexed
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-teal font-mono">
              {overview?.documents_indexed_count ?? 4}
            </span>
            <span className="text-[11px] text-txt-muted font-mono">active manuals</span>
          </div>
        </div>
      </div>

      {/* Registered Plant Machinery */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-teal" />
            <h2 className="text-base font-bold text-txt-primary">
              Facility Equipment & 3D Twins
            </h2>
          </div>
          <Link href="/machines" className="text-xs text-teal font-semibold hover:underline inline-flex items-center gap-1 font-mono">
            <span>View All Machinery</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {machines.map((m) => (
            <Link
              key={m.id}
              href={`/machines`}
              className="rounded-2xl border border-border-subtle bg-surface p-5 space-y-3 shadow-sm hover:border-teal/40 hover:bg-elevated/40 transition-all group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="rounded bg-teal/15 px-2 py-0.5 font-mono text-[10px] text-teal font-bold uppercase border border-teal/20">
                    {m.id}
                  </span>
                  <h3 className="font-bold text-sm text-txt-primary group-hover:text-teal transition-colors mt-1.5">
                    {m.name}
                  </h3>
                </div>
                <span className="rounded-full bg-success/15 px-2.5 py-0.5 font-mono text-[10px] text-success font-semibold border border-success/30">
                  {m.status || "Operational"}
                </span>
              </div>

              <div className="space-y-1 text-xs text-txt-muted font-mono border-y border-border-subtle py-2.5">
                <div>OEM: <span className="text-txt-primary">{m.manufacturer || "Flowserve"}</span></div>
                <div>Model: <span className="text-txt-primary">{m.model || "HPX-150-B"}</span></div>
                <div className="truncate">Location: <span className="text-txt-primary">{m.plant_location || "Bay C-4"}</span></div>
              </div>

              <div className="flex items-center justify-between pt-1 text-xs font-medium text-teal font-mono">
                <span>Inspect 3D Hotspots</span>
                <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
