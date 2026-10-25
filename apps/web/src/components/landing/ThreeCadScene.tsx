"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import {
  Wrench,
  ShieldAlert,
  FileText,
  CheckCircle2,
  Maximize2,
  RotateCw,
  Eye,
  Layers,
  Activity,
  Gauge,
  Sliders,
  X,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n";

interface Hotspot {
  id: string;
  name: string;
  nameHi: string;
  sopCode: string;
  spec: string;
  specHi: string;
  metric: string;
  value: string;
  status: "normal" | "warning" | "optimal";
  position: [number, number, number];
}

const CAD_HOTSPOTS: Hotspot[] = [
  {
    id: "gland",
    name: "Mechanical Seal Gland",
    nameHi: "मैकेनिकल सील ग्लैंड",
    sopCode: "SOP-PMP-402 Sec 3.2",
    spec: "Star pattern torque: 48 Nm (35.4 ft-lb)",
    specHi: "स्टार पैटर्न टॉर्क: 48 Nm (35.4 ft-lb)",
    metric: "Plan 23 Flush Temp",
    value: "54.2°C (Limit: 65°C)",
    status: "optimal",
    position: [0, 1.2, 0.8],
  },
  {
    id: "bearing",
    name: "Inboard Bearing Housing",
    nameHi: "इनबोर्ड बेयरिंग हाउसिंग",
    sopCode: "SOP-PMP-402 Sec 4.5",
    spec: "Max vibration threshold: 4.5 mm/s RMS",
    specHi: "अधिकतम कंपन सीमा: 4.5 mm/s RMS",
    metric: "Vibration RMS",
    value: "2.14 mm/s RMS",
    status: "normal",
    position: [-1.4, 0, 0],
  },
  {
    id: "flange",
    name: "Suction Manifold Strainer",
    nameHi: "सक्शन मैनिफोल्ड स्ट्रेनर",
    sopCode: "SOP-PMP-402 Sec 4.1",
    spec: "Differential limit: 0.35 bar max",
    specHi: "अधिकतम अंतर दबाव: 0.35 bar",
    metric: "Differential ΔP",
    value: "0.18 bar",
    status: "optimal",
    position: [1.4, -0.6, 0.4],
  },
  {
    id: "relief",
    name: "Proportional Relief Valve",
    nameHi: "आनुपातिक रिलीफ वाल्व",
    sopCode: "SOP-ISO-2000 Sec 2.1",
    spec: "Pilot pressure 110 bar • System 315 bar",
    specHi: "पायलट दबाव 110 bar • सिस्टम 315 bar",
    metric: "Accumulator N2",
    value: "110 bar ±2 bar",
    status: "optimal",
    position: [0, -1.2, -0.6],
  },
];

export default function ThreeCadScene() {
  const { locale } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedHotspot, setSelectedHotspot] = useState<Hotspot>(CAD_HOTSPOTS[0]);
  const [showHotspotDetails, setShowHotspotDetails] = useState<boolean>(false);
  const [isWebGlAvailable, setIsWebGlAvailable] = useState(true);
  const [explodedView, setExplodedView] = useState(false);
  const [wireframeMode, setWireframeMode] = useState(false);
  const [isRotating, setIsRotating] = useState(true);

  // References for animation state
  const explodedRef = useRef(explodedView);
  const wireframeRef = useRef(wireframeMode);
  const rotatingRef = useRef(isRotating);

  useEffect(() => {
    explodedRef.current = explodedView;
  }, [explodedView]);

  useEffect(() => {
    wireframeRef.current = wireframeMode;
  }, [wireframeMode]);

  useEffect(() => {
    rotatingRef.current = isRotating;
  }, [isRotating]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    try {
      const testCanvas = document.createElement("canvas");
      const gl = testCanvas.getContext("webgl") || testCanvas.getContext("experimental-webgl");
      if (!gl) {
        setIsWebGlAvailable(false);
        return;
      }
    } catch {
      setIsWebGlAvailable(false);
      return;
    }

    const width = container.clientWidth || 650;
    const height = 520;

    // 1. Scene & Camera Setup
    const scene = new THREE.Scene();
    scene.background = null;

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(4.2, 3.2, 5.0);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // 2. High-Tech Industrial Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const cyanSpotLight = new THREE.DirectionalLight(0x06b6d4, 2.0);
    cyanSpotLight.position.set(6, 12, 8);
    scene.add(cyanSpotLight);

    const blueRimLight = new THREE.DirectionalLight(0x3b82f6, 1.5);
    blueRimLight.position.set(-6, -4, -6);
    scene.add(blueRimLight);

    const warmAccentLight = new THREE.PointLight(0xf59e0b, 1.0, 10);
    warmAccentLight.position.set(0, 3, 2);
    scene.add(warmAccentLight);

    // 3. Volumetric Floating CAD Particles
    const particleCount = 140;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePositions[i] = (Math.random() - 0.5) * 12;
      particlePositions[i + 1] = (Math.random() - 0.5) * 8;
      particlePositions[i + 2] = (Math.random() - 0.5) * 12;
    }
    particleGeo.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x06b6d4,
      size: 0.05,
      transparent: true,
      opacity: 0.45,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // 4. Precision Mechanical Assembly Hierarchy
    const rootAssembly = new THREE.Group();

    // Central Casing
    const casingGeo = new THREE.CylinderGeometry(0.95, 0.95, 2.4, 32);
    const casingMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.85,
      roughness: 0.2,
    });
    const casing = new THREE.Mesh(casingGeo, casingMat);
    casing.rotation.z = Math.PI / 2;
    rootAssembly.add(casing);

    // Blueprint Wireframe Mesh
    const wireGeo = new THREE.WireframeGeometry(casingGeo);
    const wireMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.35,
    });
    const wireframe = new THREE.LineSegments(wireGeo, wireMat);
    wireframe.rotation.z = Math.PI / 2;
    rootAssembly.add(wireframe);

    // Left Flange (Explodable along -X)
    const flangeGeo = new THREE.CylinderGeometry(1.35, 1.35, 0.22, 32);
    const flangeMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.9,
      roughness: 0.25,
    });
    const leftFlange = new THREE.Mesh(flangeGeo, flangeMat);
    leftFlange.rotation.z = Math.PI / 2;
    leftFlange.position.x = -1.22;
    rootAssembly.add(leftFlange);

    // Right Flange (Explodable along +X)
    const rightFlange = new THREE.Mesh(flangeGeo, flangeMat);
    rightFlange.rotation.z = Math.PI / 2;
    rightFlange.position.x = 1.22;
    rootAssembly.add(rightFlange);

    // High-Speed Drive Shaft
    const shaftGeo = new THREE.CylinderGeometry(0.24, 0.24, 3.8, 32);
    const shaftMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.95,
      roughness: 0.1,
    });
    const shaft = new THREE.Mesh(shaftGeo, shaftMat);
    shaft.rotation.z = Math.PI / 2;
    rootAssembly.add(shaft);

    // Multi-Stage Impeller Discs (Rotating inside casing)
    const impellerGroup = new THREE.Group();
    const impellerGeo = new THREE.TorusGeometry(0.72, 0.14, 16, 32);
    const impellerMat = new THREE.MeshStandardMaterial({
      color: 0x0ea5e9,
      metalness: 0.8,
      roughness: 0.2,
    });

    const impeller1 = new THREE.Mesh(impellerGeo, impellerMat);
    impeller1.rotation.y = Math.PI / 2;
    impeller1.position.x = -0.45;
    impellerGroup.add(impeller1);

    const impeller2 = new THREE.Mesh(impellerGeo, impellerMat);
    impeller2.rotation.y = Math.PI / 2;
    impeller2.position.x = 0.45;
    impellerGroup.add(impeller2);

    rootAssembly.add(impellerGroup);

    // Mechanical Seal Gland Ring (Explodable along +Y)
    const glandGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.4, 24);
    const glandMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      metalness: 0.75,
      roughness: 0.15,
    });
    const sealGland = new THREE.Mesh(glandGeo, glandMat);
    sealGland.position.set(0, 1.15, 0);
    rootAssembly.add(sealGland);

    // Holographic Telemetry Rings
    const ringGeo = new THREE.RingGeometry(1.6, 1.64, 48);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.4,
    });
    const telemetryRing = new THREE.Mesh(ringGeo, ringMat);
    telemetryRing.rotation.x = Math.PI / 2;
    rootAssembly.add(telemetryRing);

    scene.add(rootAssembly);

    // 5. Dynamic Animation Loop with Exploded View Interpolation
    let animationFrameId: number;
    let isVisible = true;
    let currentExplodeFactor = 0;

    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
      },
      { threshold: 0.1 }
    );
    observer.observe(container);

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      if (!isVisible) return;

      // Handle continuous rotation
      if (rotatingRef.current) {
        rootAssembly.rotation.y += 0.004;
      }
      impellerGroup.rotation.x += 0.03; // High-speed internal spin
      telemetryRing.rotation.z += 0.008;

      // Smooth Exploded View Interpolation
      const targetExplode = explodedRef.current ? 1.0 : 0.0;
      currentExplodeFactor += (targetExplode - currentExplodeFactor) * 0.08;

      leftFlange.position.x = -1.22 - currentExplodeFactor * 0.9;
      rightFlange.position.x = 1.22 + currentExplodeFactor * 0.9;
      sealGland.position.y = 1.15 + currentExplodeFactor * 0.8;
      impeller1.position.x = -0.45 - currentExplodeFactor * 0.4;
      impeller2.position.x = 0.45 + currentExplodeFactor * 0.4;

      // Wireframe Material Toggle
      casingMat.wireframe = wireframeRef.current;
      flangeMat.wireframe = wireframeRef.current;
      shaftMat.wireframe = wireframeRef.current;
      impellerMat.wireframe = wireframeRef.current;

      renderer.render(scene, camera);
    };
    animate();

    // Resize Handler
    const handleResize = () => {
      if (!container) return;
      const newWidth = container.clientWidth;
      camera.aspect = newWidth / height;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, height);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div className="relative w-full rounded-2xl border border-border-subtle bg-surface/90 shadow-xl backdrop-blur-md overflow-hidden">
      {/* CAD Header Ribbon */}
      <div className="flex flex-wrap items-center justify-between border-b border-border-subtle bg-elevated/40 px-4 py-3 gap-2">
        <div className="flex items-center space-x-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-teal" />
          </span>
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-txt-primary">
            Digital Twin • PMP-402 Multistage Assembly
          </span>
        </div>

        {/* Interactive CAD Tools */}
        <div className="flex items-center space-x-1.5">
          {/* Explode View Toggle */}
          <button
            onClick={() => setExplodedView(!explodedView)}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-mono transition-all ${
              explodedView
                ? "bg-brand text-white border-brand shadow-xs"
                : "bg-surface border-border-subtle text-txt-muted hover:text-txt-primary hover:bg-elevated"
            }`}
            title="Toggle exploded assembly view"
          >
            <Layers className="h-3.5 w-3.5" />
            <span>{explodedView ? "Assembled" : "Explode"}</span>
          </button>

          {/* Wireframe CAD Blueprint Toggle */}
          <button
            onClick={() => setWireframeMode(!wireframeMode)}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-mono transition-all ${
              wireframeMode
                ? "bg-teal text-white border-teal shadow-xs"
                : "bg-surface border-border-subtle text-txt-muted hover:text-txt-primary hover:bg-elevated"
            }`}
            title="Toggle CAD blueprint wireframe mode"
          >
            <Eye className="h-3.5 w-3.5" />
            <span>{wireframeMode ? "Metallic" : "Wireframe"}</span>
          </button>

          {/* Pause / Resume Spin */}
          <button
            onClick={() => setIsRotating(!isRotating)}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-border-subtle bg-surface text-txt-muted hover:text-txt-primary hover:bg-elevated transition-colors"
            title="Toggle 3D rotation"
          >
            <RotateCw className={`h-3.5 w-3.5 ${isRotating ? "animate-spin text-teal" : ""}`} />
          </button>

          {/* Explicit Inspect Hotspots / SOP Toggle */}
          <button
            onClick={() => setShowHotspotDetails(!showHotspotDetails)}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-mono transition-all ${
              showHotspotDetails
                ? "bg-teal text-white border-teal shadow-xs"
                : "bg-surface border-border-subtle text-txt-muted hover:text-txt-primary hover:bg-elevated"
            }`}
            title="Explicitly toggle component SOP inspection overlay"
          >
            <FileText className="h-3.5 w-3.5" />
            <span>{showHotspotDetails ? "Hide SOP" : "Inspect SOP"}</span>
          </button>
        </div>
      </div>

      {/* Hotspots Quick Switch Bar */}
      <div className="flex space-x-1 overflow-x-auto border-b border-border-subtle bg-surface/50 p-2">
        {CAD_HOTSPOTS.map((h) => (
          <button
            key={h.id}
            onClick={() => {
              setSelectedHotspot(h);
              setShowHotspotDetails(true);
            }}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-mono whitespace-nowrap transition-all ${
              selectedHotspot.id === h.id && showHotspotDetails
                ? "bg-brand text-white font-semibold shadow-xs"
                : "bg-elevated text-txt-muted hover:text-txt-primary hover:bg-elevated/80"
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-teal" />
            <span>{locale === "hi" ? h.nameHi : h.name}</span>
          </button>
        ))}
      </div>

      {/* 3D Canvas Canvas Container */}
      <div className="relative min-h-[460px] w-full flex items-center justify-center">
        {isWebGlAvailable ? (
          <div ref={containerRef} className="h-[460px] w-full cursor-grab active:cursor-grabbing" />
        ) : (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <Wrench className="h-16 w-16 text-teal mb-3" />
            <p className="font-mono text-sm text-txt-muted">
              Static CAD Schematic Fallback Mode Active
            </p>
          </div>
        )}

        {/* Real-time Telemetry HUD Card Overlay */}
        <div className="absolute top-4 right-4 rounded-xl border border-border-subtle bg-surface/90 p-3 shadow-lg backdrop-blur-md hidden sm:block max-w-[210px]">
          <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
            <span className="font-mono text-[10px] uppercase text-txt-muted font-bold">CAD Telemetry</span>
            <span className="flex items-center gap-1 text-[10px] font-mono text-success">
              <Activity className="h-3 w-3" />
              LIVE
            </span>
          </div>
          <div className="space-y-1.5 mt-2 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-txt-muted">Rotor Speed:</span>
              <span className="font-semibold text-txt-primary">2,980 RPM</span>
            </div>
            <div className="flex justify-between">
              <span className="text-txt-muted">{selectedHotspot.metric}:</span>
              <span className="font-semibold text-teal">{selectedHotspot.value}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-txt-muted">Grounded SOP:</span>
              <span className="font-semibold text-success">Verified</span>
            </div>
          </div>
        </div>

        {/* Real-time Linked Grounded SOP Citation Callout Overlay - Only when explicitly toggled by user */}
        {showHotspotDetails && (
          <div className="absolute bottom-4 left-4 right-4 sm:right-auto sm:max-w-md rounded-xl border border-border-subtle bg-surface/95 p-4 shadow-xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-teal">
                  <FileText className="h-3.5 w-3.5" />
                  <span>{selectedHotspot.sopCode}</span>
                </div>
                <h4 className="font-bold text-sm text-txt-primary tracking-tight">
                  {locale === "hi" ? selectedHotspot.nameHi : selectedHotspot.name}
                </h4>
                <p className="text-xs text-txt-muted leading-relaxed">
                  {locale === "hi" ? selectedHotspot.specHi : selectedHotspot.spec}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="flex items-center gap-1 rounded bg-success/15 px-2 py-0.5 text-[10px] font-mono text-success border border-success/30">
                  <CheckCircle2 className="h-3 w-3" />
                  Grounded
                </span>
                <button
                  onClick={() => setShowHotspotDetails(false)}
                  className="rounded-md p-1 text-txt-muted hover:text-txt-primary hover:bg-elevated transition-colors"
                  title="Close inspection overlay"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
