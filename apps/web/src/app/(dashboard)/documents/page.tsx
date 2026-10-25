"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, FileText, Search, Trash2, Upload, X } from "lucide-react";
import { openSourceDocument } from "@/components/chat/CitationsDrawer";
import { Badge, EmptyState, formatRelative, InlineAlert, PageHeader, Skeleton, Spinner } from "@/components/ui/primitives";
import { errorMessage, fetchApi } from "@/lib/api-client";
import { useSession } from "@/lib/session";
import type { DocumentItem, Machine } from "@/types";

const ACCEPT = ".pdf,.docx,.txt,.md,.png,.jpg,.jpeg,.webp";
const MAX_MB = 50;

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentsPage() {
  const { session } = useSession();
  const [docs, setDocs] = useState<DocumentItem[] | null>(null);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "success" | "danger" | "warning"; text: string } | null>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [machineId, setMachineId] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setDocs(await fetchApi<DocumentItem[]>("/api/v1/documents"));
    } catch (err) {
      setError(errorMessage(err));
    }
  }, []);

  useEffect(() => {
    load();
    fetchApi<Machine[]>("/api/v1/machines").then(setMachines).catch(() => setMachines([]));
  }, [load, session?.workspace_id]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return (docs || []).filter((d) => !q || d.title.toLowerCase().includes(q) || d.file_name.toLowerCase().includes(q) || d.machine_id?.toLowerCase().includes(q));
  }, [docs, query]);

  const pickFile = (f: File | null) => {
    setUploadError(null);
    if (f && f.size > MAX_MB * 1024 * 1024) {
      setUploadError(`This file is ${formatSize(f.size)}. The limit is ${MAX_MB} MB.`);
      return;
    }
    setFile(f);
    if (f && !title) setTitle(f.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " "));
  };

  const upload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return setUploadError("Choose a file to upload.");
    setUploading(true);
    setUploadError(null);
    const body = new FormData();
    body.append("file", file);
    body.append("title", title.trim() || file.name);
    if (machineId) body.append("machine_id", machineId);
    body.append("version", "1.0");
    try {
      const doc = await fetchApi<DocumentItem>("/api/v1/documents/upload", { method: "POST", body, timeoutMs: 180_000 });
      setDocs((prev) => [doc, ...(prev || []).filter((d) => d.id !== doc.id)]);
      setOpen(false);
      setFile(null);
      setTitle("");
      setMachineId("");
      setNotice(
        doc.status === "ready"
          ? { tone: "success", text: `Indexed "${doc.title}": ${doc.chunk_count ?? 0} searchable sections from ${doc.page_count} page${doc.page_count === 1 ? "" : "s"}.` }
          : { tone: "warning", text: `"${doc.title}" was stored, but ${doc.error_message || "no text could be extracted"}` },
      );
    } catch (err) {
      setUploadError(errorMessage(err, "Upload failed."));
    } finally {
      setUploading(false);
    }
  };

  const remove = async (doc: DocumentItem) => {
    setDeleting(doc.id);
    try {
      await fetchApi(`/api/v1/documents/${doc.id}`, { method: "DELETE" });
      setDocs((prev) => prev?.filter((d) => d.id !== doc.id) ?? null);
      setNotice({ tone: "success", text: `Deleted "${doc.title}" and its index.` });
    } catch (err) {
      setNotice({ tone: "danger", text: `"${doc.title}" was not deleted: ${errorMessage(err)}` });
    } finally {
      setDeleting(null);
      setConfirming(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="SOP library"
        description="Manuals and procedures in this workspace. The assistant answers only from what is indexed here."
        actions={<button onClick={() => setOpen(true)} className="btn-primary"><Upload className="h-4 w-4" /> Upload document</button>}
      />

      {notice && (
        <InlineAlert tone={notice.tone} className="mb-4" action={<button onClick={() => setNotice(null)} className="icon-btn h-7 w-7" aria-label="Dismiss"><X className="h-3.5 w-3.5" /></button>}>
          {notice.text}
        </InlineAlert>
      )}
      {error && <InlineAlert tone="danger" className="mb-4" action={<button onClick={load} className="btn-ghost h-7 px-2 text-xs">Retry</button>}>{error}</InlineAlert>}

      <div className="relative mb-4 max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-txt-faint" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by title, file or equipment" className="field pl-9" aria-label="Search documents" />
      </div>

      <div className="panel overflow-x-auto">
        {docs === null && !error && <div className="space-y-3 p-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-10" />)}</div>}
        {docs && filtered.length === 0 && (
          <EmptyState
            icon={FileText}
            title={docs.length ? "No documents match" : "No documents yet"}
            description={docs.length ? "Try another search." : "Upload a PDF, Word, text or image file. Text is extracted, split into sections and indexed for search."}
            action={!docs.length && <button onClick={() => setOpen(true)} className="btn-secondary h-8">Upload the first document</button>}
          />
        )}
        {filtered.length > 0 && (
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-border-subtle text-left text-xs text-txt-muted">
                <th className="px-4 py-2.5 font-medium">Document</th>
                <th className="px-4 py-2.5 font-medium">Equipment</th>
                <th className="px-4 py-2.5 font-medium">Indexed</th>
                <th className="px-4 py-2.5 font-medium">Added</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {filtered.map((d) => (
                <tr key={d.id}>
                  <td className="max-w-[320px] px-4 py-3">
                    <p className="truncate text-txt-primary">{d.title}</p>
                    <p className="truncate text-xs text-txt-faint">{d.file_name}, {formatSize(d.file_size_bytes)}</p>
                  </td>
                  <td className="px-4 py-3">{d.machine_id ? <span className="code-id text-txt-muted">{d.machine_id}</span> : <span className="text-txt-faint">Any</span>}</td>
                  <td className="px-4 py-3">
                    {d.status === "ready" ? (
                      <span className="text-txt-muted">{d.chunk_count ?? 0} sections, {d.page_count} p.</span>
                    ) : (
                      <Badge tone="warning">{d.error_message ? "No text found" : d.status}</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-txt-muted">{formatRelative(d.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button className="icon-btn h-8 w-8" aria-label={`Open ${d.title}`} onClick={() => openSourceDocument(d.id).catch((err) => setNotice({ tone: "danger", text: err.message }))}>
                        <ExternalLink className="h-4 w-4" />
                      </button>
                      {confirming === d.id ? (
                        <>
                          <button onClick={() => remove(d)} disabled={deleting === d.id} className="btn-danger h-7 px-2 text-xs">{deleting === d.id && <Spinner className="h-3.5 w-3.5" />} Delete</button>
                          <button onClick={() => setConfirming(null)} className="btn-ghost h-7 px-2 text-xs">Cancel</button>
                        </>
                      ) : (
                        <button className="icon-btn h-8 w-8" aria-label={`Delete ${d.title}`} onClick={() => setConfirming(d.id)}>
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div aria-hidden className="absolute inset-0 bg-black/55" onClick={() => !uploading && setOpen(false)} />
          <form onSubmit={upload} role="dialog" aria-modal="true" aria-labelledby="up-title" className="panel relative w-full max-w-lg p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 id="up-title" className="text-[0.9375rem] font-semibold">Upload document</h2>
              <button type="button" disabled={uploading} onClick={() => setOpen(false)} className="icon-btn -mr-2" aria-label="Close"><X className="h-4 w-4" /></button>
            </div>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                pickFile(e.dataTransfer.files?.[0] || null);
              }}
              onClick={() => fileRef.current?.click()}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && fileRef.current?.click()}
              role="button"
              tabIndex={0}
              className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-border-strong px-4 py-8 text-center hover:border-accent/60"
            >
              <Upload className="mb-2 h-5 w-5 text-txt-muted" />
              {file ? (
                <p className="text-sm text-txt-primary">{file.name} <span className="text-txt-faint">({formatSize(file.size)})</span></p>
              ) : (
                <>
                  <p className="text-sm text-txt-primary">Drop a file here or click to choose</p>
                  <p className="mt-1 text-xs text-txt-faint">PDF, DOCX, TXT, MD, PNG, JPG or WebP, up to {MAX_MB} MB</p>
                </>
              )}
              <input ref={fileRef} type="file" accept={ACCEPT} className="hidden" onChange={(e) => pickFile(e.target.files?.[0] || null)} />
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <label className="label" htmlFor="doc-title">Title</label>
                <input id="doc-title" className="field" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={200} />
              </div>
              <div>
                <label className="label" htmlFor="doc-machine">Equipment (optional)</label>
                <select id="doc-machine" className="field" value={machineId} onChange={(e) => setMachineId(e.target.value)}>
                  <option value="">Applies to any equipment</option>
                  {machines.map((m) => <option key={m.id} value={m.id}>{m.id}: {m.name}</option>)}
                </select>
              </div>
            </div>
            {uploadError && <InlineAlert tone="danger" className="mt-4">{uploadError}</InlineAlert>}
            <div className="mt-5 flex items-center justify-end gap-2">
              {uploading && <span className="mr-auto text-xs text-txt-muted">Extracting text and indexing; large PDFs can take a minute.</span>}
              <button type="button" onClick={() => setOpen(false)} disabled={uploading} className="btn-ghost">Cancel</button>
              <button type="submit" disabled={uploading || !file} className="btn-primary">{uploading && <Spinner />} Upload and index</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
