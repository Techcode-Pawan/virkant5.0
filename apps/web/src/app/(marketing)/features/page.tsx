"use client";

import React from "react";
import Link from "next/link";
import {
  Layers,
  FileCheck,
  Languages,
  Mic,
  Cpu,
  ShieldAlert,
  Search,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n";

export default function FeaturesPage() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      <div className="max-w-2xl space-y-3">
        <span className="font-mono text-xs font-semibold uppercase tracking-wider text-teal">
          Platform Architecture & Capabilities
        </span>
        <h1 className="text-3xl font-bold tracking-tight text-txt-primary">
          Engineered for Heavy Manufacturing & Reliability
        </h1>
        <p className="text-sm sm:text-base text-txt-muted leading-relaxed">
          Comprehensive feature breakdown of the ForgeWise AI multimodal knowledge pipeline.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {/* Feature 1 */}
        <div className="rounded-xl border border-border-subtle bg-surface p-6 space-y-3">
          <Layers className="h-6 w-6 text-teal" />
          <h3 className="font-semibold text-base text-txt-primary">
            Hybrid RAG (Dense Vector + FTS)
          </h3>
          <p className="text-xs text-txt-muted leading-relaxed">
            Combines pgvector 1536-dimensional cosine similarity with PostgreSQL tsvector full-text search. Reciprocal Rank Fusion ensures exact part tags (e.g. PRV-102) and semantic meaning are retrieved simultaneously.
          </p>
        </div>

        {/* Feature 2 */}
        <div className="rounded-xl border border-border-subtle bg-surface p-6 space-y-3">
          <FileCheck className="h-6 w-6 text-success" />
          <h3 className="font-semibold text-base text-txt-primary">
            Page-Level Source Attribution
          </h3>
          <p className="text-xs text-txt-muted leading-relaxed">
            Every factual diagnostic step displays clickable citations linking to the authorized PDF page, section title, and verbatim text chunk.
          </p>
        </div>

        {/* Feature 3 */}
        <div className="rounded-xl border border-border-subtle bg-surface p-6 space-y-3">
          <Languages className="h-6 w-6 text-teal" />
          <h3 className="font-semibold text-base text-txt-primary">
            Hindi & English Bilingual Engine
          </h3>
          <p className="text-xs text-txt-muted leading-relaxed">
            Dynamic system prompt translation ensures clear Devanagari Hindi responses while strictly retaining Latin technical tags, fault codes, and torque units.
          </p>
        </div>

        {/* Feature 4 */}
        <div className="rounded-xl border border-border-subtle bg-surface p-6 space-y-3">
          <Mic className="h-6 w-6 text-brand" />
          <h3 className="font-semibold text-base text-txt-primary">
            Hands-Free Voice Interaction
          </h3>
          <p className="text-xs text-txt-muted leading-relaxed">
            Integrated Web Speech STT and TTS allow plant floor technicians wearing protective gloves to query machine diagnostics and hear spoken steps.
          </p>
        </div>

        {/* Feature 5 */}
        <div className="rounded-xl border border-border-subtle bg-surface p-6 space-y-3">
          <Cpu className="h-6 w-6 text-teal" />
          <h3 className="font-semibold text-base text-txt-primary">
            Equipment Asset Registry
          </h3>
          <p className="text-xs text-txt-muted leading-relaxed">
            Scoped queries filter knowledge by machine model, serial number, or bay location (e.g. Boiler Feed Pump PMP-402, Okuma MU-5000V).
          </p>
        </div>

        {/* Feature 6 */}
        <div className="rounded-xl border border-border-subtle bg-surface p-6 space-y-3">
          <ShieldAlert className="h-6 w-6 text-warning" />
          <h3 className="font-semibold text-base text-txt-primary">
            Automated LOTO Safety Warnings
          </h3>
          <p className="text-xs text-txt-muted leading-relaxed">
            Proactive safety rules inspect the diagnostic topic and prepend mandatory facility Lockout/Tagout callouts for high-voltage, hydraulic, or steam lines.
          </p>
        </div>
      </div>

      <div className="pt-6">
        <Link
          href="/chat"
          className="inline-flex items-center gap-2 rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:opacity-90"
        >
          <span>Test Interactive Assistant</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
