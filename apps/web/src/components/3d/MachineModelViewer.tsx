"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import Link from "next/link";
import { X, Sparkles, FileText, AlertTriangle, CheckCircle2, ChevronRight, Layers } from "lucide-react";
import { Machine } from "@/types";

interface Hotspot {
  id: string;
  label: string;
  code: string;
  sopTitle: string;
  sopSection: string;
  details: string;
  queryText: string;
  pos: [number, number, number];
}

interface MachineModelViewerProps {
  machine: Machine | null;
  onClose: () => void;
}

const MACHINE_HOTSPOTS: Record<string, Hotspot[]> = {
  "PMP-402": [
    {
      id: "pmp-h1",
      label: "Cartridge Mechanical Seal Gland",
      code: "TORQUE-48NM",
      sopTitle: "Boiler Feed Pump PMP-402 Maintenance Manual",
      sopSection: "Section 3.2: Mechanical Seal Inspection",
      details: "Gland bolts must be torqued in a star pattern to exactly 48 Nm (35.4 ft-lb). Excessive torque causes face distortion and immediate fluid leakage.",
      queryText: "What is the seal gland bolt torque specification for pump PMP-402?",
      pos: [0, 0.4, 1.2],
    },
    {
      id: "pmp-h2",
      label: "Plan 23 Seal Flush Circuit",
      code: "TEMP-MAX-65C",
      sopTitle: "Boiler Feed Pump PMP-402 Maintenance Manual",
      sopSection: "Section 3.2: Seal Flush Plan 23",
      details: "Verify seal flush Plan 23 heat exchanger return temperature does not exceed 65°C during continuous operation.",
      queryText: "What is the maximum allowed seal flush temperature for PMP-402?",
      pos: [0.9, -0.6, 0.5],
    },
    {
      id: "pmp-h3",
      label: "Inboard Bearing Housing",
      code: "VIB-4.5MMS",
      sopTitle: "Boiler Feed Pump PMP-402 Maintenance Manual",
      sopSection: "Section 4.5: Vibration & Cavitation",
      details: "Vibration exceeding 4.5 mm/s RMS indicates misalignment or cavitation. Clean suction basket if DP exceeds 0.35 bar.",
      queryText: "PMP-402 high vibration diagnostic steps",
      pos: [-0.8, 0.8, -0.6],
    },
  ],
  "CNC-MILL-02": [
    {
      id: "cnc-h1",
      label: "Spindle Chiller Return Thermocouple",
      code: "ALARM-E304",
      sopTitle: "Okuma MU-5000V Diagnostic Manual",
      sopSection: "Section 5.1: High Temp Alarm E-304",
      details: "Alarm E-304 triggers when coolant exceeds 88°C for > 45 seconds. Confirm external chiller fan spins freely and fins are not clogged.",
      queryText: "CNC Spindle chiller alarm E-304 troubleshooting steps",
      pos: [0, 1.1, 0.8],
    },
    {
      id: "cnc-h2",
      label: "Refrigerated Coolant Flow Meter",
      code: "FLOW-14.5-18L",
      sopTitle: "Okuma MU-5000V Diagnostic Manual",
      sopSection: "Section 5.1: Flow Rate Spec",
      details: "Flow rate must remain between 14.5 and 18.0 L/min. Do not run spindle above 3000 RPM while E-304 condition persists.",
      queryText: "What is the required spindle coolant flow rate on Okuma MU-5000V?",
      pos: [0.8, -0.2, 0.9],
    },
  ],
  "HYD-PRESS-01": [
    {
      id: "hyd-h1",
      label: "Proportional Relief Valve PRV-102",
      code: "VALVE-CHATTER",
      sopTitle: "2000-Ton Hydraulic Press Emergency Isolation SOP",
      sopSection: "Section 2.1: Relief Valve Chatter",
      details: "Chatter or rapid pulsing at PRV-102 indicates air entrapment in pilot control line. Bleed pilot port G1/4 until bubble-free ISO VG 46 oil flows.",
      queryText: "2000-ton hydraulic press PRV-102 relief valve chatter procedure",
      pos: [0.3, 0.6, 1.1],
    },
    {
      id: "hyd-h2",
      label: "Nitrogen Piston Accumulator",
      code: "ACCUM-110BAR",
      sopTitle: "2000-Ton Hydraulic Press Emergency Isolation SOP",
      sopSection: "Section 2.1: Accumulator Pre-Charge",
      details: "Verify nitrogen pre-charge is 110 bar +/- 5 bar at 20°C ambient. DANGER: System operating pressure is 315 bar. Never tighten under pressure.",
      queryText: "Hydraulic accumulator nitrogen pre-charge pressure for 2000-ton press",
      pos: [-0.7, -0.4, 0.7],
    },
  ],
};

export default function MachineModelViewer({ machine, onClose }: MachineModelViewerProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [selectedHotspot, setSelectedHotspot] = useState<Hotspot | null>(null);

  const machineId = machine?.id || "PMP-402";
  const hotspots = MACHINE_HOTSPOTS[machineId] || MACHINE_HOTSPOTS["PMP-402"];

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      return;
    }

    const width = container.clientWidth;
    const height = container.clientHeight;

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(2.5, 2.5, 5.5);
    camera.lookAt(0, 0, 0);

    // Assembly Group
    const modelGroup = new THREE.Group();
    scene.add(modelGroup);

    // Lathed machine geometric model
    const mainBodyGeo = new THREE.CylinderGeometry(1.0, 1.2, 2.8, 32);
    const mainBodyMat = new THREE.MeshStandardMaterial({
      color: 0x1E293B,
      metalness: 0.85,
      roughness: 0.25,
    });
    const mainBody = new THREE.Mesh(mainBodyGeo, mainBodyMat);
    modelGroup.add(mainBody);

    // Flange collars
    const flange1 = new THREE.Mesh(
      new THREE.CylinderGeometry(1.3, 1.3, 0.2, 32),
      new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.9 })
    );
    flange1.position.y = 1.0;
    modelGroup.add(flange1);

    const flange2 = new THREE.Mesh(
      new THREE.CylinderGeometry(1.35, 1.35, 0.25, 32),
      new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.9 })
    );
    flange2.position.y = -1.0;
    modelGroup.add(flange2);

    // Holographic Wireframe Cage
    const wireGeo = new THREE.CylinderGeometry(1.25, 1.45, 3.1, 16);
    const wireMat = new THREE.MeshBasicMaterial({ color: 0x06B6D4, wireframe: true, transparent: true, opacity: 0.25 });
    modelGroup.add(new THREE.Mesh(wireGeo, wireMat));

    // Hotspot 3D Spheres
    const hotspotMeshes: { mesh: THREE.Mesh; hotspot: Hotspot }[] = [];
    hotspots.forEach((h) => {
      const sphereGeo = new THREE.SphereGeometry(0.12, 16, 16);
      const sphereMat = new THREE.MeshStandardMaterial({
        color: 0xF59E0B,
        emissive: 0xF59E0B,
        emissiveIntensity: 0.6,
      });
      const sphere = new THREE.Mesh(sphereGeo, sphereMat);
      sphere.position.set(...h.pos);
      modelGroup.add(sphere);
      hotspotMeshes.push({ mesh: sphere, hotspot: h });
    });

    // Circular Base Grid
    const grid = new THREE.GridHelper(8, 16, 0x06B6D4, 0x334155);
    grid.position.y = -1.6;
    scene.add(grid);

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const light1 = new THREE.DirectionalLight(0x06B6D4, 2);
    light1.position.set(4, 6, 4);
    scene.add(light1);
    const light2 = new THREE.DirectionalLight(0xF59E0B, 1.5);
    light2.position.set(-4, -2, -3);
    scene.add(light2);

    // Mouse Interaction
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - prevMouseX;
      const deltaY = e.clientY - prevMouseY;
      modelGroup.rotation.y += deltaX * 0.008;
      modelGroup.rotation.x += deltaY * 0.008;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    container.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      if (!isDragging) {
        modelGroup.rotation.y += 0.005;
      }
      // Pulse hotspots
      hotspotMeshes.forEach(({ mesh }) => {
        mesh.scale.setScalar(1 + Math.sin(Date.now() * 0.005) * 0.15);
      });
      renderer.render(scene, camera);
    };

    animate();

    // Default select first hotspot
    setSelectedHotspot(hotspots[0]);

    return () => {
      cancelAnimationFrame(animId);
      container.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [machineId, hotspots]);

  if (!machine) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl h-[650px] rounded-3xl border border-border-subtle bg-surface shadow-2xl overflow-hidden flex flex-col md:flex-row">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 rounded-full bg-elevated/80 border border-border-subtle p-2 text-txt-muted hover:text-txt-primary hover:bg-elevated transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Left: 3D Interactive Model Canvas */}
        <div className="relative w-full md:w-3/5 h-[340px] md:h-full bg-gradient-to-b from-[#080C14] to-[#0E1524] cursor-grab active:cursor-grabbing">
          <div ref={mountRef} className="absolute inset-0" />
          <div className="absolute top-4 left-4 z-10 space-y-1 pointer-events-none">
            <span className="rounded bg-teal/15 px-2 py-0.5 font-mono text-[10px] text-teal border border-teal/20 font-bold uppercase">
              3D CAD Twin • Interactive Hotspots
            </span>
            <h3 className="text-base font-bold text-txt-primary">{machine.name}</h3>
            <p className="font-mono text-xs text-txt-muted">{machine.id} • Drag to orbit 360°</p>
          </div>

          <div className="absolute bottom-4 left-4 z-10 flex gap-2">
            {hotspots.map((h, i) => (
              <button
                key={h.id}
                onClick={() => setSelectedHotspot(h)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-mono transition-all ${
                  selectedHotspot?.id === h.id
                    ? "bg-amber-500 text-white font-bold shadow-md"
                    : "bg-surface/80 border border-border-subtle text-txt-muted hover:text-txt-primary"
                }`}
              >
                Hotspot #{i + 1}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Hotspot Inspection & Linked SOP Drawer */}
        <div className="w-full md:w-2/5 p-6 flex flex-col justify-between border-t md:border-t-0 md:border-l border-border-subtle bg-surface overflow-y-auto">
          {selectedHotspot ? (
            <div className="space-y-4">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-wider text-amber-500 font-bold">
                  Inspection Hotspot Target:
                </span>
                <h4 className="text-base font-bold text-txt-primary mt-0.5">
                  {selectedHotspot.label}
                </h4>
                <div className="flex items-center gap-1.5 font-mono text-xs text-teal mt-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-teal animate-ping" />
                  <span>Code: {selectedHotspot.code}</span>
                </div>
              </div>

              {/* Linked SOP Section Callout */}
              <div className="rounded-xl border border-border-subtle bg-elevated/40 p-4 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-txt-muted">
                  <span className="flex items-center gap-1">
                    <FileText className="h-3.5 w-3.5 text-teal" />
                    <span>Linked Manual</span>
                  </span>
                  <span className="text-success font-semibold flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Grounded
                  </span>
                </div>
                <div className="font-semibold text-xs text-txt-primary">
                  {selectedHotspot.sopTitle}
                </div>
                <div className="text-[11px] font-mono text-teal">
                  {selectedHotspot.sopSection}
                </div>
              </div>

              {/* Exact Verbatim Manual Excerpt */}
              <div className="rounded-xl border border-border-subtle bg-surface p-4 text-xs leading-relaxed text-txt-primary border-l-4 border-l-teal font-mono">
                &quot;{selectedHotspot.details}&quot;
              </div>

              {/* Operational Safety Alert */}
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-[11px] text-txt-primary leading-relaxed">
                  Verify calibration certificates and plant LOTO isolation before loosening or servicing high-pressure fittings.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center text-txt-muted space-y-2">
              <Layers className="h-8 w-8 text-teal" />
              <p className="text-xs">Click any glowing 3D hotspot on the machine to inspect linked SOP specifications.</p>
            </div>
          )}

          {/* Action: Query in AI Assistant */}
          <div className="pt-4 border-t border-border-subtle mt-4">
            {selectedHotspot && (
              <Link
                href={`/chat?machine=${machine.id}`}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:opacity-90 transition-opacity"
              >
                <Sparkles className="h-4 w-4 text-teal" />
                <span>Ask AI Assistant About This Hotspot</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
