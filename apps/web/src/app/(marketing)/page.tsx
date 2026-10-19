"use client";

import React from "react";
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
} from "lucide-react";
import ThreeCadScene from "@/components/landing/ThreeCadScene";
import { useTranslation } from "@/lib/i18n";
import { siteConfig } from "@/lib/config";

export default function MarketingPage() {
  const { t, locale } = useTranslation();

  return (
    <div className="flex flex-col space-y-16 sm:space-y-24 pb-20">
      {/* 1. Hero Section & Interactive CAD 3D Scene */}
      <section className="relative pt-10 sm:pt-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: Restrained Hero Copy */}
            <div className="lg:col-span-6 space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-border-subtle bg-surface px-3 py-1 text-xs font-mono text-txt-muted shadow-xs">
                <span className="h-2 w-2 rounded-full bg-success" />
                <span>Vikrant 5.0 Precision RAG Engine</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-txt-primary leading-tight">
                {t("landing.heroTitle")}
              </h1>

              <p className="text-base sm:text-lg text-txt-muted leading-relaxed max-w-xl">
                {t("landing.heroSubtitle")}
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap gap-3 pt-2">
                <Link
                  href="/chat"
                  className="inline-flex items-center gap-2 rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:opacity-90 transition-opacity"
                >
                  <span>{t("landing.exploreCta")}</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/features"
                  className="inline-flex items-center gap-2 rounded-md border border-border-subtle bg-surface px-5 py-2.5 text-sm font-semibold text-txt-primary hover:bg-elevated transition-colors"
                >
                  {t("landing.howItWorksCta")}
                </Link>
              </div>

              {/* Trust Badges */}
              <div className="pt-4 grid grid-cols-3 gap-4 border-t border-border-subtle">
                <div className="space-y-0.5">
                  <div className="font-mono text-xs font-semibold text-txt-primary">Zero Fabrication</div>
                  <div className="text-[11px] text-txt-muted">Strict chunk grounding</div>
                </div>
                <div className="space-y-0.5">
                  <div className="font-mono text-xs font-semibold text-txt-primary">English & Hindi</div>
                  <div className="text-[11px] text-txt-muted">Native bilingual support</div>
                </div>
                <div className="space-y-0.5">
                  <div className="font-mono text-xs font-semibold text-txt-primary">LOTO Enforced</div>
                  <div className="text-[11px] text-txt-muted">EHS safety callouts</div>
                </div>
              </div>
            </div>

            {/* Right Column: Interactive CAD 3D Digital Twin */}
            <div className="lg:col-span-6">
              <ThreeCadScene />
            </div>
          </div>
        </div>
      </section>

      {/* 2. Problem & Operational Solution */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-border-subtle bg-surface p-8 sm:p-12 shadow-sm">
          <div className="max-w-2xl space-y-3">
            <span className="font-mono text-xs font-semibold uppercase tracking-wider text-teal">
              Plant Floor Challenge
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-txt-primary">
              {t("landing.problemTitle")}
            </h2>
            <p className="text-sm sm:text-base text-txt-muted leading-relaxed">
              {t("landing.problemDesc")}
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-xl border border-border-subtle bg-elevated/40 p-5 space-y-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal/15 text-teal">
                <Search className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-base text-txt-primary">Instant Retrieval</h3>
              <p className="text-xs text-txt-muted leading-relaxed">
                Replaces manual 40-minute searches through physical binders with sub-second hybrid semantic and lexical keyword search.
              </p>
            </div>

            <div className="rounded-xl border border-border-subtle bg-elevated/40 p-5 space-y-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-success/15 text-success">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-base text-txt-primary">Page-Level Proof</h3>
              <p className="text-xs text-txt-muted leading-relaxed">
                Eliminates guesswork. Technicians inspect the exact paragraph, wiring diagram, and revision history directly in the browser.
              </p>
            </div>

            <div className="rounded-xl border border-border-subtle bg-elevated/40 p-5 space-y-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-warning/15 text-warning">
                <HardHat className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-base text-txt-primary">Safety Verification</h3>
              <p className="text-xs text-txt-muted leading-relaxed">
                Highlights Lockout/Tagout (LOTO) requirements and personal protective equipment (PPE) before any hazardous step is executed.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Core Architecture & RAG Pipeline Breakdown */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-teal">
            Engineering Specifications
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-txt-primary">
            {t("landing.featuresTitle")}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="rounded-xl border border-border-subtle bg-surface p-6 space-y-3">
            <Layers className="h-6 w-6 text-teal" />
            <h3 className="font-semibold text-sm text-txt-primary">
              {t("landing.ragTitle")}
            </h3>
            <p className="text-xs text-txt-muted leading-relaxed">
              {t("landing.ragDesc")}
            </p>
          </div>

          <div className="rounded-xl border border-border-subtle bg-surface p-6 space-y-3">
            <FileCheck className="h-6 w-6 text-success" />
            <h3 className="font-semibold text-sm text-txt-primary">
              {t("landing.citationsTitle")}
            </h3>
            <p className="text-xs text-txt-muted leading-relaxed">
              {t("landing.citationsDesc")}
            </p>
          </div>

          <div className="rounded-xl border border-border-subtle bg-surface p-6 space-y-3">
            <Languages className="h-6 w-6 text-teal" />
            <h3 className="font-semibold text-sm text-txt-primary">
              {t("landing.multilingualTitle")}
            </h3>
            <p className="text-xs text-txt-muted leading-relaxed">
              {t("landing.multilingualDesc")}
            </p>
          </div>

          <div className="rounded-xl border border-border-subtle bg-surface p-6 space-y-3">
            <Lock className="h-6 w-6 text-brand" />
            <h3 className="font-semibold text-sm text-txt-primary">
              Tenant Data Isolation
            </h3>
            <p className="text-xs text-txt-muted leading-relaxed">
              PostgreSQL Row Level Security and scoped database queries ensure complete proprietary segregation between manufacturing facilities.
            </p>
          </div>
        </div>
      </section>

      {/* 4. Responsible AI & Operational Limitations Notice */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-warning/30 bg-warning/5 p-6 sm:p-8 space-y-3">
          <div className="flex items-center gap-2 text-warning font-semibold text-sm">
            <HardHat className="h-5 w-5" />
            <span>Industrial Safety and Responsible AI Statement</span>
          </div>
          <p className="text-xs sm:text-sm text-txt-primary leading-relaxed">
            ForgeWise AI is an automated decision-support system. It is designed to accelerate knowledge retrieval and does not substitute for certified engineering authority, physical machine inspection, or regulatory compliance protocols. In cases involving high voltage, high-pressure hydraulics, hazardous materials, or confined space entry, operators must consult approved plant SOPs and physical Lockout/Tagout procedures.
          </p>
        </div>
      </section>

      {/* 5. Frequently Asked Questions */}
      <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-6">
        <h2 className="text-2xl font-bold tracking-tight text-txt-primary text-center">
          {t("landing.faqTitle")}
        </h2>
        <div className="space-y-4">
          <div className="rounded-lg border border-border-subtle bg-surface p-4">
            <h3 className="font-semibold text-sm text-txt-primary">
              How does ForgeWise AI avoid hallucinating machine specifications?
            </h3>
            <p className="mt-1 text-xs text-txt-muted leading-relaxed">
              The system utilizes dual vector and full-text indexing with a strict relevance threshold. If retrieved document chunks do not meet the minimum similarity score, the engine issues an explicit refusal stating that verified data is unavailable in the library.
            </p>
          </div>
          <div className="rounded-lg border border-border-subtle bg-surface p-4">
            <h3 className="font-semibold text-sm text-txt-primary">
              Is customer documentation used to train foundation models?
            </h3>
            <p className="mt-1 text-xs text-txt-muted leading-relaxed">
              No. All inference executes under enterprise zero-retention agreements or on customer-controlled private hardware via local Ollama instances. Customer SOPs and drawings are never used for model training.
            </p>
          </div>
          <div className="rounded-lg border border-border-subtle bg-surface p-4">
            <h3 className="font-semibold text-sm text-txt-primary">
              Can technicians interact in Hindi on the shop floor?
            </h3>
            <p className="mt-1 text-xs text-txt-muted leading-relaxed">
              Yes. The platform provides full interface and conversational translation in Hindi, including speech-to-text voice input, while preserving standardized Latin equipment identifiers and units.
            </p>
          </div>
        </div>
      </section>

      {/* 6. Final Call to Action */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-brand px-6 py-12 sm:px-12 text-center text-white space-y-4 shadow-lg">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Ready to ground your plant operations in verified knowledge?
          </h2>
          <p className="max-w-xl mx-auto text-sm text-white/80 leading-relaxed">
            Connect your equipment manuals, SOPs, and engineering drawings to an enterprise AI assistant built for reliability and safety.
          </p>
          <div className="pt-2">
            <Link
              href="/chat"
              className="inline-flex items-center gap-2 rounded-md bg-teal px-6 py-3 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition-opacity"
            >
              <span>Launch AI Assistant Console</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
