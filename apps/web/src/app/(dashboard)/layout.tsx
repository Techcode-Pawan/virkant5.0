"use client";

import React from "react";
import { Layers, Cpu, ShieldCheck } from "lucide-react";
import { useSession } from "@/lib/session";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { session, activeWorkspaceId } = useSession();

  return (
    <div className="min-h-screen flex flex-col bg-base">
      {/* Facility Telemetry Status Strip — Concise & Informative with No Duplicated Nav Links */}
      <div className="border-b border-border-subtle bg-surface/40 px-4 sm:px-8 py-1.5 flex items-center justify-between text-[11px] font-mono text-txt-muted">
        <div className="flex items-center space-x-2">
          <span className="text-txt-primary font-semibold">Vikrant Forge Bay C-4</span>
          <span className="text-border-subtle">/</span>
          <span className="hidden sm:inline">Machining & Pump Cell</span>
          <span className="text-border-subtle hidden sm:inline">/</span>
          <div className="flex items-center gap-1 text-teal font-semibold">
            <Layers className="h-3 w-3" />
            <span>{activeWorkspaceId}</span>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center gap-1 text-success font-semibold">
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
            <span className="text-[10px] hidden sm:inline">Grounded Knowledge Active</span>
          </div>
          <span className="text-border-subtle">|</span>
          <div className="flex items-center gap-1 text-txt-muted truncate max-w-[220px]">
            <ShieldCheck className="h-3 w-3 text-teal shrink-0" />
            <span>{session?.email || "operator.rajesh@vikrant.internal"}</span>
          </div>
        </div>
      </div>

      {/* Main Page Canvas — Dynamically expands to full width with comfortable wide margin */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 w-full max-w-[1780px] mx-auto transition-all">
        {children}
      </main>
    </div>
  );
}
