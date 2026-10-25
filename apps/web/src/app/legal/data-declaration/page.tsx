"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function DataDeclarationPage() {
  const lifecycleData = [
    { cat: "1. Account Identity", fields: "User UUID, email, hashed credentials, full name", store: "Supabase Auth DB", retain: "Account lifetime + 30d", del: "Cascading hard purge" },
    { cat: "2. Organization Membership", fields: "Org UUID, user role (operator, engineer)", store: "PostgreSQL profiles table", retain: "Organization lifetime", del: "Immediate on member removal" },
    { cat: "3. Uploaded Industrial Docs", fields: "OEM manuals, SOPs, P&IDs (PDF, DOCX)", store: "Private storage bucket", retain: "Org retention schedule", del: "Purged on doc delete" },
    { cat: "4. Extracted Text & OCR", fields: "Plain text, table segments, OCR labels", store: "document_chunks table", retain: "Parent doc lifetime", del: "Cascading delete with doc" },
    { cat: "5. Document Embeddings", fields: "1536-dimensional float vectors", store: "document_chunks.embedding", retain: "Parent doc lifetime", del: "Deleted with parent doc" },
    { cat: "6. Document Metadata", fields: "Title, version, page count, machine tag", store: "documents table", retain: "Document lifetime", del: "Purged upon deletion" },
    { cat: "7. Chat Messages", fields: "User query text, machine filter, timestamp", store: "messages table", retain: "Configurable (default 90d)", del: "User thread deletion" },
    { cat: "8. AI Responses", fields: "Synthesized instructions, safety warnings", store: "messages table", retain: "Conversation lifetime", del: "Deleted with conversation" },
    { cat: "9. Source Citations", fields: "Document ID, page number, verbatim excerpt", store: "citations table", retain: "Message lifetime", del: "Cascading delete with message" },
    { cat: "10. Voice Data & Transcripts", fields: "Microphone speech converted to text", store: "Ephemeral browser memory", retain: "Audio discarded immediately", del: "Zero server audio storage" },
    { cat: "11. Performance Telemetry", fields: "Latency (ms), retrieval score, gap flag", store: "analytics_events table", retain: "180 days aggregated", del: "Automated rolling purge" },
    { cat: "12. Security Audit Logs", fields: "IP address, user UUID, action, timestamp", store: "audit_logs table (append-only)", retain: "365 days immutable", del: "Purged after statutory period" },
    { cat: "13. Feedback Submissions", fields: "Rating (+1/-1), technician remarks", store: "feedback table", retain: "180 days", del: "Deleted with thread" },
    { cat: "14. User Preferences", fields: "UI language (en/hi), theme (light/dark)", store: "LocalStorage & profiles", retain: "Account lifetime", del: "Cleared on profile reset" },
    { cat: "15. System Backups", fields: "Encrypted database snapshots", store: "Encrypted backup vault", retain: "30-day rolling rotation", del: "Overwritten automatically" },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs text-txt-muted hover:text-txt-primary font-mono"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Platform
      </Link>

      <div className="space-y-2 border-b border-border-subtle pb-6">
        <span className="font-mono text-xs uppercase tracking-wider text-teal">
          Data Governance
        </span>
        <h1 className="text-3xl font-bold tracking-tight text-txt-primary">
          Enterprise Industrial Data Lifecycle Declaration
        </h1>
        <p className="text-xs text-txt-muted font-mono">
          Granular 15-Category Technical Inventory • October 20, 2026
        </p>
      </div>

      <div className="rounded-xl border border-border-subtle bg-surface shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="border-b border-border-subtle bg-elevated/40 text-[11px] uppercase tracking-wider text-txt-muted">
              <tr>
                <th className="p-3.5">Data Category</th>
                <th className="p-3.5">Example Fields</th>
                <th className="p-3.5">Storage Location</th>
                <th className="p-3.5">Retention</th>
                <th className="p-3.5 text-right">Deletion Behavior</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {lifecycleData.map((row, idx) => (
                <tr key={idx} className="hover:bg-elevated/20 transition-colors">
                  <td className="p-3.5 font-semibold text-txt-primary whitespace-nowrap">
                    {row.cat}
                  </td>
                  <td className="p-3.5 text-txt-muted max-w-xs truncate">
                    {row.fields}
                  </td>
                  <td className="p-3.5 text-txt-primary">
                    {row.store}
                  </td>
                  <td className="p-3.5 text-txt-muted">
                    {row.retain}
                  </td>
                  <td className="p-3.5 text-right text-teal whitespace-nowrap">
                    {row.del}
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
