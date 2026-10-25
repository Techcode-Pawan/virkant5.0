"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPolicyPage() {

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs text-txt-muted hover:text-txt-primary font-mono"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Platform
      </Link>

      <div className="space-y-2 border-b border-border-subtle pb-6">
        <span className="font-mono text-xs uppercase tracking-wider text-teal">
          Enterprise Compliance
        </span>
        <h1 className="text-3xl font-bold tracking-tight text-txt-primary">
          Privacy Policy
        </h1>
        <p className="text-xs text-txt-muted font-mono">
          Effective Date: October 20, 2026 • Version 1.0 (Draft for Operational Deployment)
        </p>
      </div>

      <div className="prose prose-sm max-w-none text-txt-primary space-y-6 text-xs sm:text-sm leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-txt-primary">1. Overview & Industrial Data Processing</h2>
          <p className="text-txt-muted">
            ForgeWise AI provides an automated multimodal technical retrieval platform. We process uploaded standard operating procedures, machinery manuals, and technician queries strictly to provide grounded, page-attributed answers to authorized workers.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-txt-primary">2. Categories of Processed Data</h2>
          <ul className="list-disc pl-5 space-y-1 text-txt-muted">
            <li><strong>Account Identifiers</strong>: Work email, full name, organization membership, and assigned role.</li>
            <li><strong>Uploaded SOPs & Manuals</strong>: PDF, Word, and diagram files uploaded by your Knowledge Manager into private encrypted storage.</li>
            <li><strong>Chat & Voice Inquiries</strong>: Text query submissions and temporary audio transcriptions. Raw microphone audio recordings are never stored on our servers.</li>
            <li><strong>Security Audit Logs</strong>: Timestamped records of user logins, role modifications, and document uploads/deletions.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-txt-primary">3. Zero Model Training Policy</h2>
          <div className="rounded-lg border border-teal/30 bg-teal/5 p-4 text-txt-primary">
            <strong>Commitment</strong>: Your organization&apos;s proprietary machinery manuals, engineering schematics, and operator queries are never used to train, fine-tune, or improve public foundation AI models. All inference operates under zero-data-retention enterprise terms.
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-txt-primary">4. Data Purging & Retention</h2>
          <p className="text-txt-muted">
            When an authorized administrator deletes an SOP or equipment manual, the file, its mathematical vector embeddings, and extracted chunks are purged from active databases immediately. Encrypted disaster recovery backups rotate on a 30-day schedule.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-txt-primary">5. Compliance & Contact Inquiries</h2>
          <p className="text-txt-muted">
            For data subject requests or security compliance inquiries, contact:
            <br />
            Email: <code className="text-teal font-mono">privacy@forgewise-ai.internal</code>
            <br />
            Operator Entity: <code className="font-mono text-txt-primary">[LEGAL_ENTITY_NAME_PLACEHOLDER]</code>
          </p>
        </section>
      </div>
    </div>
  );
}
