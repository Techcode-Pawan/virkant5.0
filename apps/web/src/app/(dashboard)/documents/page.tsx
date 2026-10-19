"use client";

import React, { useState, useEffect } from "react";
import {
  FileText,
  Upload,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink,
  Plus,
  X,
  FileCheck,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { fetchApi } from "@/lib/api-client";
import { DocumentItem } from "@/types";

export default function DocumentLibraryPage() {
  const { t } = useTranslation();
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    async function loadDocs() {
      try {
        const data = await fetchApi<DocumentItem[]>("/api/v1/documents");
        setDocuments(data);
      } catch (err) {
        console.error("Docs fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    loadDocs();
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !uploadTitle.trim()) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", uploadFile);
    formData.append("title", uploadTitle.trim());

    try {
      const newDoc = await fetchApi<DocumentItem>("/api/v1/documents/upload", {
        method: "POST",
        body: formData,
      });
      setDocuments((prev) => [newDoc, ...prev]);
      setUploadModalOpen(false);
      setUploadTitle("");
      setUploadFile(null);
    } catch (err: any) {
      alert(`Upload rejected: ${err.message || "File validation failed"}`);
    } finally {
      setUploading(false);
    }
  };

  const filteredDocs = documents.filter(
    (d) =>
      d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.file_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-subtle pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-txt-primary">
            {t("documents.title")}
          </h1>
          <p className="text-xs text-txt-muted mt-1">
            Standard Operating Procedures, OEM manuals, and electrical schematics indexed into pgvector.
          </p>
        </div>

        <button
          onClick={() => setUploadModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-md bg-brand px-4 py-2 text-xs font-semibold text-white shadow-xs hover:opacity-90 transition-opacity"
        >
          <Plus className="h-4 w-4" />
          <span>{t("documents.uploadButton")}</span>
        </button>
      </div>

      {/* Filter and Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-txt-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search manuals by title or filename..."
            className="w-full rounded-md border border-border-subtle bg-surface pl-9 pr-3.5 py-2 text-xs text-txt-primary focus:outline-none focus:border-teal"
          />
        </div>
      </div>

      {/* Document Table */}
      <div className="rounded-xl border border-border-subtle bg-surface shadow-xs overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-border-subtle bg-elevated/40 font-mono text-[11px] uppercase tracking-wider text-txt-muted">
            <tr>
              <th className="p-4">Document Title</th>
              <th className="p-4">Machine Scope</th>
              <th className="p-4">{t("documents.version")}</th>
              <th className="p-4">{t("documents.pages")}</th>
              <th className="p-4">{t("documents.status")}</th>
              <th className="p-4 text-right">{t("documents.actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {filteredDocs.map((doc) => (
              <tr key={doc.id} className="hover:bg-elevated/20 transition-colors">
                <td className="p-4">
                  <div className="flex items-center gap-2.5">
                    <FileText className="h-4 w-4 text-teal shrink-0" />
                    <div>
                      <div className="font-medium text-txt-primary">{doc.title}</div>
                      <div className="font-mono text-[11px] text-txt-muted">{doc.file_name}</div>
                    </div>
                  </div>
                </td>
                <td className="p-4 font-mono text-txt-primary">
                  {doc.machine_id ? (
                    <span className="rounded bg-elevated px-2 py-0.5 border border-border-subtle">
                      {doc.machine_id}
                    </span>
                  ) : (
                    <span className="text-txt-muted">Facility General</span>
                  )}
                </td>
                <td className="p-4 font-mono text-txt-muted">v{doc.version}</td>
                <td className="p-4 font-mono text-txt-primary">{doc.page_count} pgs</td>
                <td className="p-4">
                  {doc.status === "ready" && (
                    <span className="inline-flex items-center gap-1 rounded bg-success/15 px-2 py-0.5 font-mono text-[11px] text-success">
                      <CheckCircle2 className="h-3 w-3" />
                      {t("documents.ready")}
                    </span>
                  )}
                  {doc.status === "processing" && (
                    <span className="inline-flex items-center gap-1 rounded bg-warning/15 px-2 py-0.5 font-mono text-[11px] text-warning animate-pulse">
                      <Clock className="h-3 w-3" />
                      {t("documents.processing")}
                    </span>
                  )}
                  {doc.status === "failed" && (
                    <span className="inline-flex items-center gap-1 rounded bg-danger/15 px-2 py-0.5 font-mono text-[11px] text-danger">
                      <AlertCircle className="h-3 w-3" />
                      {t("documents.failed")}
                    </span>
                  )}
                </td>
                <td className="p-4 text-right">
                  <a
                    href={`http://localhost:8000/api/v1/documents/${doc.id}/pages/1`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-teal font-medium hover:underline font-mono"
                  >
                    <span>View Page 1</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Upload Modal */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl border border-border-subtle bg-surface p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
              <h3 className="font-semibold text-sm text-txt-primary">
                {t("documents.uploadModalTitle")}
              </h3>
              <button
                onClick={() => setUploadModalOpen(false)}
                className="text-txt-muted hover:text-txt-primary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-txt-muted mb-1">
                  {t("documents.titleLabel")}
                </label>
                <input
                  type="text"
                  required
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="e.g. Centrifugal Chiller Service Guide"
                  className="w-full rounded-md border border-border-subtle bg-elevated/50 px-3 py-2 text-xs text-txt-primary focus:outline-none focus:border-teal"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-txt-muted mb-1">
                  {t("documents.fileLabel")}
                </label>
                <input
                  type="file"
                  required
                  accept=".pdf,.docx,.txt,.md,.png,.jpg,.jpeg"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-txt-muted file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-brand file:text-white hover:file:opacity-90"
                />
                <p className="mt-1 text-[11px] text-txt-muted">
                  Max size: 50MB. Validated via binary magic bytes.
                </p>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setUploadModalOpen(false)}
                  className="px-3 py-1.5 rounded-md border border-border-subtle bg-surface text-xs font-medium text-txt-muted hover:text-txt-primary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || !uploadFile}
                  className="px-4 py-1.5 rounded-md bg-brand text-xs font-semibold text-white shadow-xs hover:opacity-90 disabled:opacity-50"
                >
                  {uploading ? "Extracting & Indexing..." : t("documents.submitUpload")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
