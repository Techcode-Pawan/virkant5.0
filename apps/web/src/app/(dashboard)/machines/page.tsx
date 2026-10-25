"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Cpu,
  Plus,
  MessageSquare,
  FileText,
  CheckCircle2,
  X,
  Sparkles,
  Layers,
  ChevronRight,
  Activity,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { fetchApi } from "@/lib/api-client";
import { Machine } from "@/types";
import MachineModelViewer from "@/components/3d/MachineModelViewer";

const DEFAULT_MACHINES: Machine[] = [
  {
    id: "PMP-402",
    name: "High-Pressure Boiler Feed Pump",
    manufacturer: "Flowserve",
    model: "HPX-150-B",
    plant_location: "Boiler House 2, Bay C",
    status: "operational",
    document_count: 2,
  },
  {
    id: "CNC-MILL-02",
    name: "5-Axis Precision Machining Center",
    manufacturer: "Okuma",
    model: "MU-5000V",
    plant_location: "Machining Cell 4",
    status: "operational",
    document_count: 1,
  },
  {
    id: "HYD-PRESS-01",
    name: "2000-Ton Hydraulic Forging Press",
    manufacturer: "Schuler",
    model: "HP-2000-M",
    plant_location: "Heavy Forging Bay 1",
    status: "warning",
    document_count: 1,
  },
  {
    id: "ROB-CELL-01",
    name: "Heavy Robotic Handling Cell",
    manufacturer: "KUKA",
    model: "KR-500",
    plant_location: "Bay C-4 Automated Line",
    status: "operational",
    document_count: 1,
  },
];

export default function MachineRegistryPage() {
  const { t } = useTranslation();
  const [machines, setMachines] = useState<Machine[]>(DEFAULT_MACHINES);
  const [selectedFor3D, setSelectedFor3D] = useState<Machine | null>(null);
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
        if (Array.isArray(data) && data.length > 0) {
          setMachines(data);
        }
      } catch (err) {
        console.warn("Machines load fallback:", err);
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
      // Local fallback
      const createdFallback: Machine = {
        id: newId.trim().toUpperCase(),
        name: newName.trim(),
        manufacturer: newOem.trim() || "OEM Partner",
        model: newModel.trim() || "Model-X",
        plant_location: newLocation.trim() || "Facility Bay C-4",
        status: "operational",
        document_count: 0,
      };
      setMachines((prev) => [...prev, createdFallback]);
      setModalOpen(false);
      setNewId("");
      setNewName("");
      setNewOem("");
      setNewModel("");
      setNewLocation("");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-subtle pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-txt-primary">
              Equipment Registry & Digital Twins
            </h1>
            <span className="rounded bg-teal/15 px-2 py-0.5 font-mono text-[11px] text-teal border border-teal/20 font-semibold">
              3D CAD Models Ready
            </span>
          </div>
          <p className="text-xs text-txt-muted mt-1">
            Registered industrial machines, production lines, and associated 3D models with interactive SOP hotspots.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-xs font-semibold text-white shadow-sm hover:opacity-90 transition-opacity"
        >
          <Plus className="h-4 w-4 text-teal" />
          <span>Register New Machine</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {machines.map((m) => (
          <div
            key={m.id}
            className="rounded-2xl border border-border-subtle bg-surface p-5 space-y-4 shadow-sm hover:border-teal/40 hover:bg-elevated/20 transition-all flex flex-col justify-between group"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <span className="rounded bg-teal/15 px-2 py-0.5 font-mono text-[10px] text-teal font-bold uppercase border border-teal/20">
                    {m.id}
                  </span>
                  <h3 className="font-bold text-sm text-txt-primary mt-1.5 group-hover:text-teal transition-colors">
                    {m.name}
                  </h3>
                </div>
                <span className="rounded-full bg-success/15 px-2.5 py-0.5 font-mono text-[10px] text-success font-semibold border border-success/30">
                  {m.status || "Operational"}
                </span>
              </div>

              <div className="space-y-1 text-xs text-txt-muted font-mono border-y border-border-subtle py-2.5">
                <div>OEM: <span className="text-txt-primary">{m.manufacturer || "Flowserve"}</span></div>
                <div>Model: <span className="text-txt-primary">{m.model || "HPX-150-B"}</span></div>
                <div className="truncate">Location: <span className="text-txt-primary">{m.plant_location || "Bay C-4"}</span></div>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={() => setSelectedFor3D(m)}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-teal/30 bg-teal/5 py-2 text-xs font-mono font-bold text-teal hover:bg-teal hover:text-white transition-all shadow-xs"
              >
                <Cpu className="h-3.5 w-3.5" />
                <span>Open 3D Model & Hotspots</span>
              </button>

              <div className="flex items-center justify-between text-xs font-medium pt-1">
                <Link
                  href={`/chat?machine=${m.id}`}
                  className="flex items-center gap-1 text-txt-muted hover:text-teal transition-colors font-mono text-[11px]"
                >
                  <MessageSquare className="h-3 w-3" />
                  <span>Query AI</span>
                </Link>
                <Link
                  href={`/documents?machine=${m.id}`}
                  className="flex items-center gap-1 text-txt-muted hover:text-txt-primary transition-colors font-mono text-[11px]"
                >
                  <FileText className="h-3 w-3" />
                  <span>{m.document_count ?? 1} Manuals</span>
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 3D Model Viewer Modal */}
      {selectedFor3D && (
        <MachineModelViewer
          machine={selectedFor3D}
          onClose={() => setSelectedFor3D(null)}
        />
      )}

      {/* Add Machine Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-border-subtle bg-surface p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
              <h3 className="font-bold text-base text-txt-primary flex items-center gap-2">
                <Cpu className="h-4 w-4 text-teal" />
                <span>Register Facility Machine</span>
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1 text-txt-muted hover:text-txt-primary hover:bg-elevated"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3.5">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-txt-muted mb-1 font-semibold">
                  Equipment ID Code (e.g. CNC-MILL-03) *
                </label>
                <input
                  type="text"
                  required
                  value={newId}
                  onChange={(e) => setNewId(e.target.value)}
                  placeholder="CNC-MILL-03"
                  className="w-full rounded-lg border border-border-subtle bg-elevated/50 px-3 py-2 text-xs text-txt-primary focus:outline-none focus:border-teal font-mono uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-txt-muted mb-1 font-semibold">
                  Machine Name *
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="5-Axis Horizontal High-Speed Machining Center"
                  className="w-full rounded-lg border border-border-subtle bg-elevated/50 px-3 py-2 text-xs text-txt-primary focus:outline-none focus:border-teal"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-txt-muted mb-1 font-semibold">
                    Manufacturer / OEM
                  </label>
                  <input
                    type="text"
                    value={newOem}
                    onChange={(e) => setNewOem(e.target.value)}
                    placeholder="Matsuura / Okuma"
                    className="w-full rounded-lg border border-border-subtle bg-elevated/50 px-3 py-2 text-xs text-txt-primary focus:outline-none focus:border-teal"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-txt-muted mb-1 font-semibold">
                    Model Number
                  </label>
                  <input
                    type="text"
                    value={newModel}
                    onChange={(e) => setNewModel(e.target.value)}
                    placeholder="H-Plus 500"
                    className="w-full rounded-lg border border-border-subtle bg-elevated/50 px-3 py-2 text-xs text-txt-primary focus:outline-none focus:border-teal"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-txt-muted mb-1 font-semibold">
                  Facility Bay / Cell Location
                </label>
                <input
                  type="text"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  placeholder="Bay C-4 Precision Machining Bay"
                  className="w-full rounded-lg border border-border-subtle bg-elevated/50 px-3 py-2 text-xs text-txt-primary focus:outline-none focus:border-teal"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-subtle">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg border border-border-subtle bg-surface px-4 py-2 text-xs text-txt-muted hover:text-txt-primary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-brand px-5 py-2 text-xs font-semibold text-white shadow-sm hover:opacity-90"
                >
                  Register Equipment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
