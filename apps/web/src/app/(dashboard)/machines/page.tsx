"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Cpu, FileText, Plus, X } from "lucide-react";
import { openSourceDocument } from "@/components/chat/CitationsDrawer";
import { EmptyState, InlineAlert, PageHeader, Skeleton, Spinner } from "@/components/ui/primitives";
import { ROLE_LEVEL } from "@/components/layout/nav";
import { errorMessage, fetchApi } from "@/lib/api-client";
import { useSession } from "@/lib/session";
import type { DocumentItem, Machine } from "@/types";

export default function MachinesPage() {
  const { session } = useSession();
  const [machines, setMachines] = useState<Machine[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Machine | null>(null);
  const [docs, setDocs] = useState<DocumentItem[] | null>(null);
  const [docsError, setDocsError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ id: "", name: "", manufacturer: "", model: "", plant_location: "" });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const canRegister = (ROLE_LEVEL[session?.role || "viewer"] || 1) >= ROLE_LEVEL.engineer;

  const load = useCallback(async () => {
    setError(null);
    try {
      setMachines(await fetchApi<Machine[]>("/api/v1/machines"));
    } catch (err) {
      setError(errorMessage(err));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, session?.workspace_id]);

  useEffect(() => {
    if (!selected) return;
    setDocs(null);
    setDocsError(null);
    fetchApi<DocumentItem[]>(`/api/v1/documents?machine_id=${encodeURIComponent(selected.id)}`)
      .then((d) => setDocs(d.filter((x) => x.machine_id === selected.id)))
      .catch((err) => setDocsError(errorMessage(err)));
  }, [selected]);

  const register = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const created = await fetchApi<Machine>("/api/v1/machines", {
        method: "POST",
        body: JSON.stringify({ ...form, id: form.id.trim().toUpperCase() }),
      });
      setMachines((prev) => [...(prev || []), created].sort((a, b) => a.id.localeCompare(b.id)));
      setForm({ id: "", name: "", manufacturer: "", model: "", plant_location: "" });
      setFormOpen(false);
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Equipment"
        description="Registered plant equipment. Link manuals to a machine when uploading so answers can be scoped to it."
        actions={canRegister && <button onClick={() => setFormOpen(true)} className="btn-primary"><Plus className="h-4 w-4" /> Register equipment</button>}
      />
      {error && <InlineAlert tone="danger" className="mb-4" action={<button onClick={load} className="btn-ghost h-7 px-2 text-xs">Retry</button>}>{error}</InlineAlert>}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="panel divide-y divide-border-subtle self-start">
          {machines === null && !error && <div className="space-y-3 p-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12" />)}</div>}
          {machines?.length === 0 && <EmptyState icon={Cpu} title="No equipment registered" description="Engineers can register machines here." />}
          {machines?.map((m) => (
            <button
              key={m.id}
              onClick={() => setSelected(m)}
              aria-pressed={selected?.id === m.id}
              className={`flex w-full items-center gap-4 px-4 py-3.5 text-left transition-colors hover:bg-elevated/40 ${selected?.id === m.id ? "bg-elevated/60" : ""}`}
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm text-txt-primary">
                  <span className="code-id mr-2 text-txt-muted">{m.id}</span>
                  {m.name}
                </p>
                <p className="mt-0.5 truncate text-xs text-txt-faint">
                  {[m.manufacturer, m.model, m.plant_location].filter(Boolean).join(", ") || "No details recorded"}
                </p>
              </div>
              <span className="shrink-0 text-xs tabular-nums text-txt-muted">{m.document_count ?? 0} docs</span>
            </button>
          ))}
        </div>

        <aside className="panel self-start p-5">
          {!selected ? (
            <p className="text-sm text-txt-muted">Select a machine to see its documents and ask about it.</p>
          ) : (
            <div>
              <p className="code-id text-txt-muted">{selected.id}</p>
              <h2 className="mt-0.5 text-[0.9375rem] font-semibold">{selected.name}</h2>
              <dl className="mt-4 grid grid-cols-[110px_1fr] gap-y-1.5 text-sm">
                <dt className="text-txt-muted">Manufacturer</dt><dd>{selected.manufacturer || "Not set"}</dd>
                <dt className="text-txt-muted">Model</dt><dd>{selected.model || "Not set"}</dd>
                <dt className="text-txt-muted">Location</dt><dd>{selected.plant_location || "Not set"}</dd>
              </dl>
              <p className="mt-5 text-sm font-medium">Linked documents</p>
              {docsError && <p className="mt-2 text-sm text-danger">{docsError}</p>}
              {docs === null && !docsError && <Skeleton className="mt-2 h-10" />}
              {docs?.length === 0 && (
                <p className="mt-2 text-sm text-txt-muted">
                  None yet. <Link href="/documents" className="text-accent hover:underline">Upload a manual</Link> and link it to {selected.id}.
                </p>
              )}
              <ul className="mt-2 space-y-1">
                {docs?.map((d) => (
                  <li key={d.id}>
                    <button onClick={() => openSourceDocument(d.id).catch(() => {})} className="flex w-full items-center gap-2 rounded px-1.5 py-1 text-left text-sm hover:bg-elevated">
                      <FileText className="h-4 w-4 shrink-0 text-accent" />
                      <span className="truncate">{d.title}</span>
                    </button>
                  </li>
                ))}
              </ul>
              <div className="mt-5 flex flex-wrap gap-2 border-t border-border-subtle pt-4">
                <Link href={`/chat?machine=${encodeURIComponent(selected.id)}`} className="btn-primary h-8 px-3">Ask about {selected.id}</Link>
                <Link href="/voice" className="btn-ghost h-8 px-3">Use voice</Link>
              </div>
            </div>
          )}
        </aside>
      </div>

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div aria-hidden className="absolute inset-0 bg-black/55" onClick={() => setFormOpen(false)} />
          <form onSubmit={register} role="dialog" aria-modal="true" aria-labelledby="reg-title" className="panel relative w-full max-w-md p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 id="reg-title" className="text-[0.9375rem] font-semibold">Register equipment</h2>
              <button type="button" onClick={() => setFormOpen(false)} className="icon-btn -mr-2" aria-label="Close"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3">
              {([
                ["id", "Equipment ID", "CNC-MILL-03", true],
                ["name", "Name", "5-axis machining centre", true],
                ["manufacturer", "Manufacturer", "", false],
                ["model", "Model", "", false],
                ["plant_location", "Location", "", false],
              ] as const).map(([key, label, placeholder, required]) => (
                <div key={key}>
                  <label className="label" htmlFor={`m-${key}`}>{label}{required ? "" : " (optional)"}</label>
                  <input
                    id={`m-${key}`}
                    required={required}
                    minLength={required ? 2 : undefined}
                    value={form[key]}
                    placeholder={placeholder}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    className={`field ${key === "id" ? "font-mono uppercase" : ""}`}
                  />
                </div>
              ))}
            </div>
            {formError && <InlineAlert tone="danger" className="mt-4">{formError}</InlineAlert>}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setFormOpen(false)} className="btn-ghost">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary">{saving && <Spinner />} Register</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
