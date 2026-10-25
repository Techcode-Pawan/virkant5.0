"use client";

import React, { useEffect, useRef, useState } from "react";
import { AlertTriangle, ExternalLink, X } from "lucide-react";
import { Spinner } from "@/components/ui/primitives";
import { getStoredToken } from "@/lib/api-client";
import { siteConfig } from "@/lib/config";
import type { Citation } from "@/types";

interface CitationsDrawerProps {
  citation: Citation | null;
  onClose: () => void;
}

/** Opens the stored source file (auth header required, so it is fetched as a blob). */
export async function openSourceDocument(documentId: string, page?: number) {
  const token = getStoredToken();
  const res = await fetch(`${siteConfig.apiBaseUrl}/api/v1/documents/${encodeURIComponent(documentId)}/file`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(res.status === 404 ? "The source file is no longer available." : "Could not open the source file.");
  const url = URL.createObjectURL(await res.blob());
  window.open(page ? `${url}#page=${page}` : url, "_blank", "noopener");
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export default function CitationsDrawer({ citation, onClose }: CitationsDrawerProps) {
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!citation) return;
    setError(null);
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [citation, onClose]);

  if (!citation) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div aria-hidden className="absolute inset-0 bg-black/50" onClick={onClose} />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="citation-title"
        className="relative flex h-full w-full max-w-md flex-col border-l border-border-subtle bg-surface"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border-subtle px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs text-txt-muted">Source, page {citation.page_number}</p>
            <h3 id="citation-title" className="mt-0.5 text-[0.9375rem] font-semibold text-txt-primary">
              {citation.document_title}
            </h3>
            {citation.section_title && <p className="mt-0.5 text-sm text-txt-muted">{citation.section_title}</p>}
          </div>
          <button ref={closeRef} onClick={onClose} className="icon-btn -mr-2" aria-label="Close source">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          <blockquote className="border-l-2 border-accent pl-4 text-sm leading-relaxed text-txt-primary">
            {citation.excerpt}
          </blockquote>
          {typeof citation.relevance_score === "number" && (
            <p className="text-xs text-txt-faint">Relative match strength {Math.round(citation.relevance_score * 100)}% among the excerpts used for this answer.</p>
          )}
          <div className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/[0.06] px-3.5 py-3 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <p className="text-txt-muted">
              Check ratings, torque values and wiring against the machine nameplate and the approved SOP before starting work.
            </p>
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border-subtle px-5 py-3">
          <button
            onClick={async () => {
              setOpening(true);
              setError(null);
              try {
                await openSourceDocument(citation.document_id, citation.page_number);
              } catch (err: any) {
                setError(err.message);
              } finally {
                setOpening(false);
              }
            }}
            disabled={opening}
            className="btn-secondary"
          >
            {opening ? <Spinner /> : <ExternalLink className="h-4 w-4" />}
            Open source file
          </button>
          <button onClick={onClose} className="btn-ghost">Close</button>
        </div>
      </aside>
    </div>
  );
}
