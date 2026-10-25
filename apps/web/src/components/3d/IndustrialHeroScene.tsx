"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Activity, Gauge, Zap, Shield, Cpu, RefreshCw } from "lucide-react";

export default function IndustrialHeroScene() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [fps, setFps] = useState(60);
  const [telemetry, setTelemetry] = useState({
    rpm: 2980,
    pressure: 41.2,
    temp: 54.8,
    vibration: 1.82,
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Check WebGL availability
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    } catch {
      return; // WebGL not supported, fallback rendered
    }

    const width = container.clientWidth;
    const height = container.clientHeight;

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 3, 10);
    camera.lookAt(0, 0, 0);

    // Group containing the industrial machine assembly
    const machineGroup = new THREE.Group();
    scene.add(machineGroup);

    // 1. Central Precision Pump Housing (Lathed Steel Cylinder with chamfer)
    const housingGeo = new THREE.CylinderGeometry(1.4, 1.6, 3.2, 32);
    const housingMat = new THREE.MeshStandardMaterial({
      color: 0x1E293B,
      metalness: 0.85,
      roughness: 0.25,
      wireframe: false,
    });
    const housing = new THREE.Mesh(housingGeo, housingMat);
    housing.castShadow = true;
    machineGroup.add(housing);

    // 2. High-Tech Holographic Wireframe Cage
    const wireframeGeo = new THREE.CylinderGeometry(1.65, 1.85, 3.5, 16);
    const wireframeMat = new THREE.MeshBasicMaterial({
      color: 0x06B6D4,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
    });
    const wireframeCage = new THREE.Mesh(wireframeGeo, wireframeMat);
    machineGroup.add(wireframeCage);

    // 3. Rotating Mechanical Impeller / Rotor Turbine
    const impellerGroup = new THREE.Group();
    const coreGeo = new THREE.CylinderGeometry(0.3, 0.3, 4.2, 16);
    const coreMat = new THREE.MeshStandardMaterial({ color: 0xF59E0B, metalness: 0.9, roughness: 0.2 });
    const shaft = new THREE.Mesh(coreGeo, coreMat);
    impellerGroup.add(shaft);

    for (let i = 0; i < 6; i++) {
      const bladeGeo = new THREE.BoxGeometry(1.8, 0.08, 0.4);
      const bladeMat = new THREE.MeshStandardMaterial({
        color: 0x06B6D4,
        metalness: 0.7,
        roughness: 0.3,
        emissive: 0x06B6D4,
        emissiveIntensity: 0.15,
      });
      const blade = new THREE.Mesh(bladeGeo, bladeMat);
      blade.rotation.y = (i * Math.PI) / 3;
      blade.position.y = 0.5 - (i % 2) * 0.4;
      impellerGroup.add(blade);
    }
    machineGroup.add(impellerGroup);

    // 4. Caliper Ring Guider
    const torusGeo = new THREE.TorusGeometry(2.1, 0.06, 16, 64);
    const torusMat = new THREE.MeshStandardMaterial({
      color: 0xF59E0B,
      emissive: 0xF59E0B,
      emissiveIntensity: 0.3,
      metalness: 0.9,
    });
    const caliperRing = new THREE.Mesh(torusGeo, torusMat);
    caliperRing.rotation.x = Math.PI / 2;
    machineGroup.add(caliperRing);

    // 5. Holographic Floor Grid
    const grid = new THREE.GridHelper(16, 24, 0x06B6D4, 0x1E293B);
    grid.position.y = -2.2;
    scene.add(grid);

    // 6. Particle Sparks
    const sparkCount = 80;
    const sparkGeo = new THREE.BufferGeometry();
    const sparkPos = new Float32Array(sparkCount * 3);
    for (let i = 0; i < sparkCount * 3; i += 3) {
      sparkPos[i] = (Math.random() - 0.5) * 8;
      sparkPos[i + 1] = (Math.random() - 0.5) * 6;
      sparkPos[i + 2] = (Math.random() - 0.5) * 8;
    }
    sparkGeo.setAttribute("position", new THREE.BufferAttribute(sparkPos, 3));
    const sparkMat = new THREE.PointsMaterial({
      color: 0x22D3EE,
      size: 0.07,
      transparent: true,
      opacity: 0.75,
    });
    const sparks = new THREE.Points(sparkGeo, sparkMat);
    scene.add(sparks);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const cyanKeyLight = new THREE.PointLight(0x06B6D4, 45, 20);
    cyanKeyLight.position.set(4, 5, 5);
    scene.add(cyanKeyLight);

    const amberRimLight = new THREE.PointLight(0xF59E0B, 30, 20);
    amberRimLight.position.set(-5, -2, -4);
    scene.add(amberRimLight);

    // Mouse Parallax Reaction
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const onMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseY = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    };

    container.addEventListener("mousemove", onMouseMove);

    // Resize Handler
    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    // Animation Loop
    let animId: number;
    let lastTime = performance.now();
    let frameCount = 0;

    const animate = () => {
      animId = requestAnimationFrame(animate);

      // Smooth mouse lerp
      targetX += (mouseX - targetX) * 0.05;
      targetY += (mouseY - targetY) * 0.05;

      // Rotate impeller and machine
      impellerGroup.rotation.y += 0.045;
      caliperRing.rotation.z += 0.015;
      wireframeCage.rotation.y -= 0.008;

      machineGroup.rotation.y = targetX * 0.6 + 0.3;
      machineGroup.rotation.x = -targetY * 0.3;

      // Float sparks slightly
      sparks.rotation.y += 0.0015;

      renderer.render(scene, camera);

      // FPS tracking
      frameCount++;
      const now = performance.now();
      if (now - lastTime >= 1000) {
        setFps(frameCount);
        frameCount = 0;
        lastTime = now;
      }
    };

    animate();

    // Telemetry jitter simulation
    const interval = setInterval(() => {
      setTelemetry((prev) => ({
        rpm: Math.round(2980 + (Math.random() - 0.5) * 15),
        pressure: parseFloat((41.2 + (Math.random() - 0.5) * 0.4).toFixed(1)),
        temp: parseFloat((54.8 + (Math.random() - 0.5) * 0.6).toFixed(1)),
        vibration: parseFloat((1.82 + (Math.random() - 0.5) * 0.08).toFixed(2)),
      }));
    }, 2000);

    return () => {
      cancelAnimationFrame(animId);
      clearInterval(interval);
      window.removeEventListener("resize", onResize);
      container.removeEventListener("mousemove", onMouseMove);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div className="relative w-full h-[400px] sm:h-[480px] rounded-3xl border border-border-subtle bg-gradient-to-b from-surface via-[#0A0E18] to-surface overflow-hidden shadow-2xl group">
      {/* Three.js Canvas Container */}
      <div ref={containerRef} className="absolute inset-0 cursor-grab active:cursor-grabbing" />

      {/* Top Overlay: Digital Twin Telemetry Callouts */}
      <div className="absolute top-4 left-4 right-4 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        <div className="flex items-center gap-2 rounded-xl border border-teal/30 bg-surface/85 backdrop-blur-md px-3 py-1.5 font-mono text-xs shadow-lg">
          <span className="flex h-2 w-2 rounded-full bg-teal animate-ping" />
          <span className="font-bold text-txt-primary">PMP-402 DIGITAL TWIN</span>
          <span className="text-txt-muted text-[10px]">| 3D CAD Live Mesh</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="rounded-lg border border-border-subtle bg-surface/85 backdrop-blur-md px-2.5 py-1 font-mono text-[10px] text-txt-muted">
            FPS: <span className="text-success font-bold">{fps}</span> (WebGL)
          </div>
        </div>
      </div>

      {/* Bottom Live Machine Metrics HUD */}
      <div className="absolute bottom-4 left-4 right-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5 pointer-events-none">
        <div className="rounded-xl border border-border-subtle bg-surface/85 backdrop-blur-md p-2.5 shadow-md">
          <div className="flex items-center justify-between text-[10px] font-mono text-txt-muted uppercase">
            <span>Shaft Speed</span>
            <Activity className="h-3 w-3 text-teal" />
          </div>
          <div className="text-base font-bold font-mono text-txt-primary mt-0.5">
            {telemetry.rpm} <span className="text-[10px] font-normal text-txt-muted">RPM</span>
          </div>
        </div>

        <div className="rounded-xl border border-border-subtle bg-surface/85 backdrop-blur-md p-2.5 shadow-md">
          <div className="flex items-center justify-between text-[10px] font-mono text-txt-muted uppercase">
            <span>Discharge Pressure</span>
            <Gauge className="h-3 w-3 text-amber-500" />
          </div>
          <div className="text-base font-bold font-mono text-txt-primary mt-0.5">
            {telemetry.pressure} <span className="text-[10px] font-normal text-txt-muted">bar</span>
          </div>
        </div>

        <div className="rounded-xl border border-border-subtle bg-surface/85 backdrop-blur-md p-2.5 shadow-md">
          <div className="flex items-center justify-between text-[10px] font-mono text-txt-muted uppercase">
            <span>Seal Temp (Plan 23)</span>
            <Zap className="h-3 w-3 text-teal" />
          </div>
          <div className="text-base font-bold font-mono text-txt-primary mt-0.5">
            {telemetry.temp} <span className="text-[10px] font-normal text-txt-muted">°C</span>
          </div>
        </div>

        <div className="rounded-xl border border-border-subtle bg-surface/85 backdrop-blur-md p-2.5 shadow-md">
          <div className="flex items-center justify-between text-[10px] font-mono text-txt-muted uppercase">
            <span>Housing Vibration</span>
            <Shield className="h-3 w-3 text-success" />
          </div>
          <div className="text-base font-bold font-mono text-txt-primary mt-0.5">
            {telemetry.vibration} <span className="text-[10px] font-normal text-txt-muted">mm/s</span>
          </div>
        </div>
      </div>

      {/* Interaction Hint */}
      <div className="absolute top-1/2 left-4 -translate-y-1/2 hidden md:block pointer-events-none opacity-40 group-hover:opacity-100 transition-opacity">
        <span className="font-mono text-[10px] uppercase tracking-widest text-teal vertical-rl transform -rotate-90 block">
          ◀ MOUSE PARALLAX ACTIVE ▶
        </span>
      </div>
    </div>
  );
}
