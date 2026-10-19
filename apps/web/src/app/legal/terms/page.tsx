"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, HardHat, AlertTriangle } from "lucide-react";

export default function TermsOfUsePage() {
  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs text-txt-muted hover:text-txt-primary font-mono"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Platform
      </Link>

      <div className="space-y-2 border-b border-border-subtle pb-6">
        <span className="font-mono text-xs uppercase tracking-wider text-warning">
          Safety & Operational Terms
        </span>
        <h1 className="text-3xl font-bold tracking-tight text-txt-primary">
          Terms of Use & Industrial Safety Disclaimers
        </h1>
        <p className="text-xs text-txt-muted font-mono">
          Effective Date: October 20, 2026 • Version 1.0 (Draft)
        </p>
      </div>

      <div className="prose prose-sm max-w-none text-txt-primary space-y-6 text-xs sm:text-sm leading-relaxed">
        {/* Prominent Safety Warning Banner */}
        <div className="rounded-xl border border-warning/40 bg-warning/5 p-5 space-y-2">
          <div className="flex items-center gap-2 text-warning font-semibold text-sm">
            <HardHat className="h-5 w-5" />
            <span>MANDATORY INDUSTRIAL SAFETY NOTICE</span>
          </div>
          <p className="text-txt-primary leading-relaxed text-xs">
            ForgeWise AI is an automated technical retrieval and diagnostic decision-support system. It does NOT replace qualified certified engineering personnel, approved facility safety procedures, or physical equipment inspection.
          </p>
        </div>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-txt-primary">1. Physical Verification & LOTO Protocols</h2>
          <p className="text-txt-muted">
            All pressure limits, torque specifications, electrical wiring tags, and hydraulic ratings retrieved through the assistant must be physically verified against official OEM manuals and physical machine nameplates prior to executing maintenance. Workers must follow facility Lockout/Tagout (LOTO) procedures before opening machine guards or entering hazardous areas.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-txt-primary">2. No Circumvention of Safety Devices</h2>
          <p className="text-txt-muted">
            The platform must never be used to generate instructions for bypassing emergency stop (E-stop) circuits, overriding interlock switches, or defeating safety relief valves.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-txt-primary">3. Intellectual Property</h2>
          <p className="text-txt-muted">
            Your facility retains all ownership rights to all uploaded SOPs, blueprints, and manuals. The platform software, algorithms, and 3D CAD visualization interfaces remain the proprietary property of the platform licensor.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-txt-primary">4. Limitation of Operational Liability</h2>
          <p className="text-txt-muted">
            To the maximum extent permitted by applicable law, the platform provider shall not be liable for equipment damage, plant production downtime, or personal injury resulting from improper machine operation or failure to adhere to physical plant safety standards.
          </p>
        </section>
      </div>
    </div>
  );
}
