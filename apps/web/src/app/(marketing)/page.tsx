"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Search,
  BookOpen,
  Cpu,
  CheckCircle2,
  Lock,
  ArrowRight,
  HardHat,
  Languages,
  Mic,
  Database,
  Layers,
  FileCheck,
  Sparkles,
  Upload,
  Zap,
  Globe,
  Sliders,
  ChevronRight,
  Activity,
} from "lucide-react";
import ThreeCadScene from "@/components/landing/ThreeCadScene";
import { useTranslation } from "@/lib/i18n";
import { useSession } from "@/lib/session";
import { siteConfig } from "@/lib/config";

export default function MarketingPage() {
  const { t, locale } = useTranslation();
  const { session, signIn, activeWorkspaceId } = useSession();

  // Interactive Live Grounding Simulator state
  const [demoQuery, setDemoQuery] = useState("What is the bolt torque on pump PMP-402?");
  const [demoAnswer, setDemoAnswer] = useState<string | null>(
    "Gland bolts on pump PMP-402 must be torqued in a star pattern to exactly 48 Nm (35.4 ft-lb). Over-torquing causes seal face distortion and fluid leakage."
  );
  const [demoCitation, setDemoCitation] = useState("SOP-PMP-402 • Page 14 • Sec 3.2");

  const sampleQueries = [
    {
      q: "What is the bolt torque on pump PMP-402?",
      a: "Gland bolts on pump PMP-402 must be torqued in a star pattern to exactly 48 Nm (35.4 ft-lb). Over-torquing causes seal face distortion and immediate fluid leakage.",
      cit: "SOP-PMP-402 • Page 14 • Sec 3.2",
    },
    {
      q: "How to resolve spindle coolant alarm E-304?",
      a: "Alarm E-304 triggers when coolant exceeds 88°C for 45s. Verify external chiller fan spins freely, clean radiator fins, and ensure circulation is 14.5-18.0 L/min. Do not run above 3000 RPM.",
      cit: "Okuma MU-5000V Manual • Page 34 • Sec 5.1",
    },
    {
      q: "Why is hydraulic valve PRV-102 chattering?",
      a: "Chatter at PRV-102 indicates air entrapment in pilot lines. De-energize high-pressure pilot solenoid and bleed port G1/4 until bubble-free ISO VG 46 oil flows. Nitrogen pre-charge: 110 bar.",
      cit: "Hydraulic Press SOP • Page 8 • Sec 2.1",
    },
  ];

  return (
    <div className="flex flex-col space-y-16 sm:space-y-24 pb-20">
      {/* 1. Hero Section & Interactive CAD 3D Scene */}
      <section className="relative pt-8 sm:pt-14">
        {/* Subtle background ambient grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#06b6d408_1px,transparent_1px),linear-gradient(to_bottom,#06b6d408_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Left Column: Hero Copy & Value Prop */}
            <div className="lg:col-span-6 space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-teal/30 bg-teal/5 px-3 py-1 text-xs font-mono text-teal shadow-xs">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-teal" />
                </span>
                <span>ForgeWise AI • Vikrant 5.0 Platform</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-txt-primary leading-tight">
                {locale === "hi"
                  ? "औद्योगिक ज्ञान का सटीक, ग्राउंडेड AI सहायक"
                  : "Precision Grounded AI Copilot for Heavy Industrial Operations"}
              </h1>

              <p className="text-base sm:text-lg text-txt-muted leading-relaxed max-w-xl">
                {locale === "hi"
                  ? "मानक संचालन प्रक्रियाओं (SOPs), OEM मैनुअल और CAD स्कीमेटिक्स को अद्वितीय सुरक्षित वर्कस्पेस में इनजेस्ट करें। बहु-भाषी और बहु-LLM सहायता के साथ त्वरित और सटीक उत्तर प्राप्त करें।"
                  : "Empower plant technicians and frontline engineers with zero-hallucination, page-level grounded answers. Ingest custom SOP manuals, run multi-LLM workflows, and manage isolated multi-user workspaces."}
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap gap-3 pt-2">
                <Link
                  href="/chat"
                  className="inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:opacity-90 transition-opacity"
                >
                  <Sparkles className="h-4 w-4 text-teal" />
                  <span>Launch AI Assistant</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <Link
                  href="/documents"
                  className="inline-flex items-center gap-2 rounded-lg border border-border-subtle bg-surface px-5 py-2.5 text-sm font-semibold text-txt-primary hover:bg-elevated transition-colors shadow-xs"
                >
                  <Upload className="h-4 w-4 text-teal" />
                  <span>Upload Custom SOP</span>
                </Link>
              </div>

              {/* Key Architectural Pillars Badges */}
              <div className="pt-4 grid grid-cols-3 gap-4 border-t border-border-subtle">
                <div className="space-y-1">
                  <div className="font-mono text-xs font-bold text-txt-primary flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-teal" />
                    <span>Multi-User Sessions</span>
                  </div>
                  <div className="text-[11px] text-txt-muted">Isolated per-user workspaces</div>
                </div>

                <div className="space-y-1">
                  <div className="font-mono text-xs font-bold text-txt-primary flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5 text-brand" />
                    <span>Multi-LLM & Locale</span>
                  </div>
                  <div className="text-[11px] text-txt-muted">Gemini, GPT-4o & 6 Languages</div>
                </div>

                <div className="space-y-1">
                  <div className="font-mono text-xs font-bold text-txt-primary flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-success" />
                    <span>Custom SOP RAG</span>
                  </div>
                  <div className="text-[11px] text-txt-muted">Instant pgvector indexing</div>
                </div>
              </div>
            </div>

            {/* Right Column: Re-engineered 3D CAD Animated Scene */}
            <div className="lg:col-span-6">
              <ThreeCadScene />
            </div>
          </div>
        </div>
      </section>

      {/* 2. Interactive Live Grounded Ingestion & RAG Playground */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-border-subtle bg-surface/90 p-6 sm:p-10 shadow-lg backdrop-blur-md space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-subtle pb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-teal" />
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-teal">
                  Real-Time Grounding Simulator
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-txt-primary mt-1">
                Zero-Hallucination Industrial Knowledge Base
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <span className="rounded bg-elevated px-2.5 py-1 text-xs font-mono text-txt-muted border border-border-subtle">
                Active: {activeWorkspaceId}
              </span>
              <Link
                href="/chat"
                className="inline-flex items-center gap-1 text-xs font-semibold text-teal hover:underline"
              >
                Open Full Console <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          {/* Sample Query Selectors */}
          <div className="space-y-2">
            <span className="font-mono text-[11px] uppercase tracking-wider text-txt-muted">
              Select or Test Plant Inquiries:
            </span>
            <div className="flex flex-wrap gap-2">
              {sampleQueries.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setDemoQuery(item.q);
                    setDemoAnswer(item.a);
                    setDemoCitation(item.cit);
                  }}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-mono text-left transition-all ${
                    demoQuery === item.q
                      ? "bg-brand text-white border-brand shadow-xs font-semibold"
                      : "bg-surface border-border-subtle text-txt-muted hover:text-txt-primary hover:bg-elevated"
                  }`}
                >
                  {item.q}
                </button>
              ))}
            </div>
          </div>

          {/* Grounded Result Display Card */}
          <div className="rounded-xl border border-teal/20 bg-teal/5 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-mono font-semibold text-teal">
                <FileCheck className="h-4 w-4" />
                <span>{demoCitation}</span>
              </span>
              <span className="rounded bg-success/20 px-2 py-0.5 font-mono text-[10px] text-success font-bold border border-success/30">
                STRICTLY GROUNDED
              </span>
            </div>

            <p className="text-sm text-txt-primary leading-relaxed font-sans font-medium">
              {demoAnswer}
            </p>

            <div className="pt-2 flex items-center justify-between text-[11px] text-txt-muted border-t border-teal/15 font-mono">
              <span>Latency: 118ms • Retrieval: Hybrid pgvector + Lexical</span>
              <Link href="/documents" className="text-teal hover:underline">
                Upload your company SOP &rarr;
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Three Pillars: Multi-User, Custom Ingestion, Multi-LLM */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Multi-User Session Isolation */}
          <div className="rounded-2xl border border-border-subtle bg-surface p-6 shadow-sm space-y-3 hover:border-teal/30 transition-colors">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal/15 text-teal">
              <Layers className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-base text-txt-primary">
              Multi-User Workspace Isolation
            </h3>
            <p className="text-xs text-txt-muted leading-relaxed">
              Every sign-in generates a unique, isolated workspace with dedicated SOP manuals, chat history, and telemetry. Easily switch between plant roles or create clean test sessions with 1 click.
            </p>
            <div className="pt-2 font-mono text-[11px] text-teal">
              UUID Workspaces • Session Tokens
            </div>
          </div>

          {/* Card 2: Custom SOP Manual Ingestion */}
          <div className="rounded-2xl border border-border-subtle bg-surface p-6 shadow-sm space-y-3 hover:border-teal/30 transition-colors">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/15 text-brand">
              <Upload className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-base text-txt-primary">
              Custom SOP Knowledge Base
            </h3>
            <p className="text-xs text-txt-muted leading-relaxed">
              Upload custom OEM manuals, emergency isolation procedures, or wiring diagrams in PDF, DOCX, TXT, or Markdown. The pipeline extracts, chunks, and indexes with zero manual tagging.
            </p>
            <div className="pt-2 font-mono text-[11px] text-brand">
              Structure-Aware • 1536d Cosine Vectors
            </div>
          </div>

          {/* Card 3: Multi-LLM & Multi-Language */}
          <div className="rounded-2xl border border-border-subtle bg-surface p-6 shadow-sm space-y-3 hover:border-teal/30 transition-colors">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-500">
              <Globe className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-base text-txt-primary">
              Multi-LLM & Multilingual Engine
            </h3>
            <p className="text-xs text-txt-muted leading-relaxed">
              Seamlessly toggle between Gemini 2.5 Flash, GPT-4o, Claude 3.5, and air-gapped edge Ollama models. Instant bilingual translation into English, Hindi, Spanish, German, French, and Japanese.
            </p>
            <div className="pt-2 font-mono text-[11px] text-amber-500">
              5 LLM Adapters • 6 Supported Languages
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
