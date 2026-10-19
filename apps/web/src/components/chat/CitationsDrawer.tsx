"use client";

import React from "react";
import { X, ExternalLink, ShieldCheck, FileText, CheckCircle2, AlertTriangle } from "lucide-react";
import { Citation } from "@/types";
import { useTranslation } from "@/lib/i18n";

interface CitationsDrawerProps {
  citation: Citation | null;
  onClose: () => void;
}

export default function CitationsDrawer({ citation, onClose }: CitationsDrawerProps) {
  const { locale, t } = useTranslation();

  if (!citation) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-lg bg-surface border-l border-border-subtle h-full shadow-2xl flex flex-col p-6 overflow-y-auto animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border-subtle">
          <div className="flex items-center space-x-2">
            <span className="flex h-7 w-7 items-center justify-center rounded bg-teal/15 text-teal">
              <FileText className="h-4 w-4" />
            </span>
            <div>
              <h3 className="font-semibold text-sm text-txt-primary">
                {t("chat.citationsHeader")}
              </h3>
              <p className="font-mono text-xs text-txt-muted">
                {t("chat.page")} {citation.page_number}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-txt-muted hover:text-txt-primary hover:bg-elevated"
            aria-label="Close citations drawer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="mt-6 space-y-6 flex-1">
          {/* Document metadata card */}
          <div className="rounded-lg border border-border-subtle bg-elevated/40 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs uppercase tracking-wider text-txt-muted">
                Source Document
              </span>
              <span className="flex items-center gap-1 rounded bg-success/15 px-2 py-0.5 text-xs font-mono font-medium text-success">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Verified Grounding
              </span>
            </div>
            <h4 className="font-medium text-sm text-txt-primary">
              {citation.document_title}
            </h4>
            {citation.section_title && (
              <p className="text-xs text-teal font-mono">
                {citation.section_title}
              </p>
            )}
          </div>

          {/* Verbatim Excerpt */}
          <div className="space-y-2">
            <label className="font-mono text-xs uppercase tracking-wider text-txt-muted block">
              Document Excerpt
            </label>
            <div className="rounded-lg border border-border-subtle bg-surface p-4 text-sm leading-relaxed text-txt-primary border-l-4 border-l-teal font-mono">
              &quot;{citation.excerpt}&quot;
            </div>
          </div>

          {/* Safety Notice */}
          <div className="rounded-lg border border-warning/30 bg-warning/5 p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed text-txt-primary">
              <strong className="font-semibold text-warning block mb-1">
                EHS Operational Caution:
              </strong>
              Cross-check all hydraulic ratings, electrical schemas, and torque values against the physical machine nameplate and approved plant SOP before executing maintenance.
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-border-subtle flex items-center justify-between">
          <a
            href={`http://localhost:8000/api/v1/documents/${citation.document_id}/pages/${citation.page_number}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-xs font-medium text-teal hover:underline"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            {t("chat.inspectSource")}
          </a>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md bg-elevated text-xs font-medium text-txt-primary hover:bg-elevated/80"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
