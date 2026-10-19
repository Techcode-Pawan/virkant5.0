"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Wrench, ShieldAlert, FileText, CheckCircle2 } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

interface Hotspot {
  id: string;
  name: string;
  nameHi: string;
  sopCode: string;
  spec: string;
  specHi: string;
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
    position: [0, 1.2, 0.8],
  },
  {
    id: "bearing",
    name: "Inboard Bearing Housing",
    nameHi: "इनबोर्ड बेयरिंग हाउसिंग",
    sopCode: "SOP-PMP-402 Sec 4.5",
    spec: "Max vibration threshold: 4.5 mm/s RMS",
    specHi: "अधिकतम कंपन सीमा: 4.5 mm/s RMS",
    position: [-1.4, 0, 0],
  },
  {
    id: "flange",
    name: "Suction Manifold Strainer",
    nameHi: "सक्शन मैनिफोल्ड स्ट्रेनर",
    sopCode: "SOP-PMP-402 Sec 4.1",
    spec: "Differential limit: 0.35 bar max",
    specHi: "अधिकतम अंतर दबाव: 0.35 bar",
    position: [1.4, -0.6, 0.4],
  },
];

export default function ThreeCadScene() {
  const { locale } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedHotspot, setSelectedHotspot] = useState<Hotspot>(CAD_HOTSPOTS[0]);
  const [isWebGlAvailable, setIsWebGlAvailable] = useState(true);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Check WebGL availability
    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      if (!gl) {
        setIsWebGlAvailable(false);
        return;
      }
    } catch {
      setIsWebGlAvailable(false);
      return;
    }

    const width = container.clientWidth || 600;
    const height = 480;

    // 1. Scene & Camera Setup
    const scene = new THREE.Scene();
    scene.background = null; // transparent to match theme

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(3.5, 2.8, 4.5);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    // 2. Industrial Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x0ea5e9, 1.4);
    dirLight1.position.set(5, 10, 7);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x64748b, 0.8);
    dirLight2.position.set(-5, -5, -5);
    scene.add(dirLight2);

    // 3. Precision CAD Mechanical Assembly (Main Pump Casing + Shaft + Flanges)
    const assemblyGroup = new THREE.Group();

    // Central cylindrical casing
    const casingGeo = new THREE.CylinderGeometry(0.9, 0.9, 2.2, 32);
    const cadMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.8,
      roughness: 0.25,
      wireframe: false,
    });
    const casing = new THREE.Mesh(casingGeo, cadMat);
    casing.rotation.z = Math.PI / 2;
    assemblyGroup.add(casing);

    // Wireframe overlay for precision CAD blueprint look
    const wireGeo = new THREE.WireframeGeometry(casingGeo);
    const wireMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.25 });
    const wireframe = new THREE.LineSegments(wireGeo, wireMat);
    wireframe.rotation.z = Math.PI / 2;
    assemblyGroup.add(wireframe);

    // Flange rings
    const flangeGeo = new THREE.CylinderGeometry(1.25, 1.25, 0.18, 32);
    const flangeMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9, roughness: 0.3 });
    const flange1 = new THREE.Mesh(flangeGeo, flangeMat);
    flange1.rotation.z = Math.PI / 2;
    flange1.position.x = 1.1;
    assemblyGroup.add(flange1);

    const flange2 = new THREE.Mesh(flangeGeo, flangeMat);
    flange2.rotation.z = Math.PI / 2;
    flange2.position.x = -1.1;
    assemblyGroup.add(flange2);

    // Precision Center Impeller Hub
    const hubGeo = new THREE.TorusGeometry(0.7, 0.15, 16, 32);
    const hubMat = new THREE.MeshStandardMaterial({ color: 0x0ea5e9, metalness: 0.7, roughness: 0.2 });
    const hub = new THREE.Mesh(hubGeo, hubMat);
    hub.rotation.y = Math.PI / 2;
    assemblyGroup.add(hub);

    // Drive Shaft
    const shaftGeo = new THREE.CylinderGeometry(0.25, 0.25, 3.4, 24);
    const shaftMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.95, roughness: 0.1 });
    const shaft = new THREE.Mesh(shaftGeo, shaftMat);
    shaft.rotation.z = Math.PI / 2;
    assemblyGroup.add(shaft);

    scene.add(assemblyGroup);

    // 4. Subtle Controlled CAD Rotation
    let animationFrameId: number;
    let isVisible = true;

    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
      },
      { threshold: 0.1 }
    );
    observer.observe(container);

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      if (isVisible) {
        assemblyGroup.rotation.y += 0.003;
        hub.rotation.z += 0.008;
        renderer.render(scene, camera);
      }
    };
    animate();

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
    <div className="relative w-full rounded-xl border border-border-subtle bg-surface p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between border-b border-border-subtle pb-3">
        <div className="flex items-center space-x-2">
          <span className="h-2.5 w-2.5 rounded-full bg-teal animate-pulse" />
          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-txt-muted">
            CAD Digital Twin • PMP-402 Assembly
          </span>
        </div>
        <div className="flex space-x-1.5">
          {CAD_HOTSPOTS.map((h) => (
            <button
              key={h.id}
              onClick={() => setSelectedHotspot(h)}
              className={`rounded px-2.5 py-1 text-xs font-mono transition-colors ${
                selectedHotspot.id === h.id
                  ? "bg-brand text-white shadow-sm"
                  : "bg-elevated text-txt-muted hover:text-txt-primary"
              }`}
            >
              {locale === "hi" ? h.nameHi : h.name}
            </button>
          ))}
        </div>
      </div>

      {/* 3D Canvas or Fallback */}
      <div className="relative min-h-[440px] w-full flex items-center justify-center">
        {isWebGlAvailable ? (
          <div ref={containerRef} className="h-[440px] w-full cursor-grab active:cursor-grabbing" />
        ) : (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <Wrench className="h-16 w-16 text-teal mb-3" />
            <p className="font-mono text-sm text-txt-muted">
              Static CAD Schematic Fallback Mode Active
            </p>
          </div>
        )}

        {/* Real-time Linked SOP Citation Callout Overlay */}
        <div className="absolute bottom-4 left-4 right-4 sm:right-auto sm:max-w-md rounded-lg border border-border-subtle bg-surface/95 p-3.5 shadow-md backdrop-blur-md">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-mono text-teal">
                <FileText className="h-3.5 w-3.5" />
                <span>{selectedHotspot.sopCode}</span>
              </div>
              <h4 className="mt-1 font-semibold text-sm text-txt-primary">
                {locale === "hi" ? selectedHotspot.nameHi : selectedHotspot.name}
              </h4>
              <p className="mt-1 text-xs text-txt-muted">
                {locale === "hi" ? selectedHotspot.specHi : selectedHotspot.spec}
              </p>
            </div>
            <span className="flex items-center gap-1 rounded bg-success/15 px-1.5 py-0.5 text-[10px] font-mono text-success">
              <CheckCircle2 className="h-3 w-3" />
              Grounded
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
