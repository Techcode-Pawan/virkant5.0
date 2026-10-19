"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Cpu, Plus, MessageSquare, FileText, CheckCircle2, X } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { fetchApi } from "@/lib/api-client";
import { Machine } from "@/types";

export default function MachineRegistryPage() {
  const { t } = useTranslation();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [newId, setNewId] = useState("");
  const [newName, setNewName] = useState("");
  const [newOem, setNewOem] = useState("");
  const [newModel, setNewModel] = useState("");
  const [newLocation, setNewLocation] = useState("");

  useEffect(() => {
    async function loadMachines() {
      try {
        const data = await fetchApi<Machine[]>("/api/v1/machines");
        setMachines(data);
      } catch (err) {
        console.error("Machine load error:", err);
      }
    }
    loadMachines();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newId || !newName) return;
    try {
      const created = await fetchApi<Machine>("/api/v1/machines", {
        method: "POST",
        body: JSON.stringify({
          id: newId.trim().toUpperCase(),
          name: newName.trim(),
          manufacturer: newOem.trim(),
          model: newModel.trim(),
          plant_location: newLocation.trim(),
        }),
      });
      setMachines((prev) => [...prev, created]);
      setModalOpen(false);
      setNewId("");
      setNewName("");
      setNewOem("");
      setNewModel("");
      setNewLocation("");
    } catch (err: any) {
      alert(`Registration error: ${err.message || "Failed to register equipment"}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-subtle pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-txt-primary">
            {t("machines.title")}
          </h1>
          <p className="text-xs text-txt-muted mt-1">
            Registered industrial machines, production lines, and associated SOP manuals.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-md bg-brand px-4 py-2 text-xs font-semibold text-white shadow-xs hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          <span>{t("machines.addMachine")}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {machines.map((m) => (
          <div
            key={m.id}
            className="rounded-xl border border-border-subtle bg-surface p-6 space-y-4 shadow-xs"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="font-mono text-xs text-teal font-semibold">
                  {m.id}
                </span>
                <h3 className="font-semibold text-base text-txt-primary mt-1">
                  {m.name}
                </h3>
              </div>
              <span className="rounded bg-success/15 px-2 py-0.5 font-mono text-[10px] text-success">
                Active
              </span>
            </div>

            <div className="space-y-1.5 text-xs text-txt-muted font-mono border-y border-border-subtle py-3">
              <div>Manufacturer: <span className="text-txt-primary">{m.manufacturer || "N/A"}</span></div>
              <div>Model: <span className="text-txt-primary">{m.model || "N/A"}</span></div>
              <div>Location: <span className="text-txt-primary">{m.plant_location || "N/A"}</span></div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <Link
                href={`/chat?machine=${m.id}`}
                className="flex items-center gap-1.5 text-xs font-semibold text-teal hover:underline"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                <span>Launch Diagnostics</span>
              </Link>
              <Link
                href={`/documents?machine=${m.id}`}
                className="flex items-center gap-1 text-xs text-txt-muted hover:text-txt-primary"
              >
                <FileText className="h-3.5 w-3.5" />
                <span>{m.document_count ?? 1} SOPs</span>
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Add Machine Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl border border-border-subtle bg-surface p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
              <h3 className="font-semibold text-sm text-txt-primary">
                Register Plant Equipment
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-txt-muted hover:text-txt-primary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="block font-mono uppercase text-txt-muted mb-1">
                  Machine Identifier Tag (e.g. TURB-GEN-01)
                </label>
                <input
                  type="text"
                  required
                  value={newId}
                  onChange={(e) => setNewId(e.target.value)}
                  placeholder="PMP-403"
                  className="w-full rounded-md border border-border-subtle bg-elevated/50 px-3 py-2 text-txt-primary focus:outline-none focus:border-teal font-mono uppercase"
                />
              </div>

              <div>
                <label className="block font-mono uppercase text-txt-muted mb-1">
                  Equipment Name
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Secondary Boiler Feed Pump"
                  className="w-full rounded-md border border-border-subtle bg-elevated/50 px-3 py-2 text-txt-primary focus:outline-none focus:border-teal"
                />
              </div>

              <div>
                <label className="block font-mono uppercase text-txt-muted mb-1">
                  Manufacturer (OEM)
                </label>
                <input
                  type="text"
                  value={newOem}
                  onChange={(e) => setNewOem(e.target.value)}
                  placeholder="Flowserve"
                  className="w-full rounded-md border border-border-subtle bg-elevated/50 px-3 py-2 text-txt-primary focus:outline-none focus:border-teal"
                />
              </div>

              <div>
                <label className="block font-mono uppercase text-txt-muted mb-1">
                  Model
                </label>
                <input
                  type="text"
                  value={newModel}
                  onChange={(e) => setNewModel(e.target.value)}
                  placeholder="HPX-200"
                  className="w-full rounded-md border border-border-subtle bg-elevated/50 px-3 py-2 text-txt-primary focus:outline-none focus:border-teal"
                />
              </div>

              <div>
                <label className="block font-mono uppercase text-txt-muted mb-1">
                  Plant Location
                </label>
                <input
                  type="text"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  placeholder="Boiler House 2, Bay D"
                  className="w-full rounded-md border border-border-subtle bg-elevated/50 px-3 py-2 text-txt-primary focus:outline-none focus:border-teal"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3 py-1.5 rounded-md border border-border-subtle bg-surface text-txt-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-md bg-brand text-white font-semibold shadow-xs"
                >
                  Register Asset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
