"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import EmblemMark from "./EmblemMark";

export type EmblemState = "idle" | "listening" | "processing" | "speaking";

interface AIEmblem3DProps {
  state?: EmblemState;
  className?: string;
  /** Accessible description of what the emblem currently represents. */
  label?: string;
}

// Motion profile per state: rotation speed (rad/s), ring pulse amplitude, core glow.
const PROFILES: Record<EmblemState, { spin: number; pulse: number; glow: number }> = {
  idle: { spin: 0.22, pulse: 0, glow: 0.04 },
  listening: { spin: 0.3, pulse: 0.025, glow: 0.12 },
  processing: { spin: 0.85, pulse: 0.01, glow: 0.18 },
  speaking: { spin: 0.38, pulse: 0.015, glow: 0.3 },
};

const MAX_FPS = 40;

/**
 * Procedural "neural core": a faceted steel icosahedron with thin-film iridescence
 * (the same physics that gives tempered steel its straw → blue colours) inside a
 * lattice of nodes and connections, circled by a fine ring. No external assets.
 *
 * Cost control: renders only while on-screen and the tab is visible, caps the frame
 * rate, caps the pixel ratio, renders a single still frame when the user prefers
 * reduced motion, and disposes every GPU resource on unmount.
 */
export default function AIEmblem3D({ state = "idle", className = "", label = "ForgeWise AI emblem" }: AIEmblem3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<EmblemState>(state);
  const [webglFailed, setWebglFailed] = useState(false);

  stateRef.current = state;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
    } catch {
      setWebglFailed(true);
      return;
    }
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.95;
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envTexture = pmrem.fromScene(roomEnv, 0.04).texture;
    scene.environment = envTexture;

    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
    camera.position.set(0, 0, 7);

    const root = new THREE.Group();
    root.rotation.set(0.35, 0.4, 0);
    scene.add(root);

    // Core: faceted, polished, iridescent steel.
    const coreGeometry = new THREE.IcosahedronGeometry(1, 1);
    const coreMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x7d8796,
      metalness: 1,
      roughness: 0.3,
      flatShading: true,
      // A thin, narrow film range keeps the sheen to straw → bronze → blue temper tones.
      iridescence: 0.55,
      iridescenceIOR: 1.3,
      iridescenceThicknessRange: [300, 420],
      envMapIntensity: 0.85,
      clearcoat: 0.35,
      clearcoatRoughness: 0.25,
      emissive: new THREE.Color(0x3b6bc2),
      emissiveIntensity: 0.04,
    });
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    root.add(core);

    // Lattice: icosahedral network of nodes and connections around the core.
    const lattice = new THREE.Group();
    root.add(lattice);
    const latticeSource = new THREE.IcosahedronGeometry(1.8, 0);
    const edgesGeometry = new THREE.EdgesGeometry(latticeSource);
    const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x7ba3ea, transparent: true, opacity: 0.42 });
    lattice.add(new THREE.LineSegments(edgesGeometry, edgeMaterial));

    const positions = latticeSource.getAttribute("position");
    const nodes: THREE.Vector3[] = [];
    for (let i = 0; i < positions.count; i++) {
      const v = new THREE.Vector3().fromBufferAttribute(positions, i);
      if (!nodes.some((n) => n.distanceToSquared(v) < 1e-4)) nodes.push(v);
    }
    const spokePoints: number[] = [];
    nodes.forEach((n) => {
      const inner = n.clone().multiplyScalar(0.62);
      spokePoints.push(inner.x, inner.y, inner.z, n.x, n.y, n.z);
    });
    const spokeGeometry = new THREE.BufferGeometry();
    spokeGeometry.setAttribute("position", new THREE.Float32BufferAttribute(spokePoints, 3));
    const spokeMaterial = new THREE.LineBasicMaterial({ color: 0x9dbdf2, transparent: true, opacity: 0.22 });
    lattice.add(new THREE.LineSegments(spokeGeometry, spokeMaterial));

    const nodeGeometry = new THREE.SphereGeometry(0.055, 16, 12);
    const nodeMaterial = new THREE.MeshStandardMaterial({
      color: 0xb9c2cf,
      metalness: 0.8,
      roughness: 0.35,
      emissive: new THREE.Color(0xd4a64a),
      emissiveIntensity: 0.18,
    });
    const nodeMesh = new THREE.InstancedMesh(nodeGeometry, nodeMaterial, nodes.length);
    const m = new THREE.Matrix4();
    nodes.forEach((n, i) => nodeMesh.setMatrixAt(i, m.makeTranslation(n.x, n.y, n.z)));
    lattice.add(nodeMesh);
    latticeSource.dispose();

    // Ring.
    const ringGeometry = new THREE.TorusGeometry(2.3, 0.011, 8, 180);
    const ringMaterial = new THREE.MeshStandardMaterial({ color: 0xc9d3e3, metalness: 1, roughness: 0.32 });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.set(1.22, 0.28, 0);
    scene.add(ring);

    // Lighting: warm key + temper-blue rim on top of the room environment.
    const key = new THREE.DirectionalLight(0xffdcae, 1.4);
    key.position.set(3, 4, 5);
    const rim = new THREE.DirectionalLight(0x7ba3ea, 2.2);
    rim.position.set(-4, -1.5, -3);
    scene.add(key, rim, new THREE.AmbientLight(0xffffff, 0.15));

    // Sizing: keep the whole emblem (radius ≈ 2.4) in frame at any aspect ratio.
    const resize = () => {
      const width = Math.max(1, container.clientWidth);
      const height = Math.max(1, container.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      const fitRadius = 2.45;
      const vFov = THREE.MathUtils.degToRad(camera.fov);
      const distV = fitRadius / Math.sin(vFov / 2);
      const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
      const distH = fitRadius / Math.sin(hFov / 2);
      camera.position.z = Math.max(distV, distH);
      camera.updateProjectionMatrix();
      if (!running) renderer.render(scene, camera);
    };

    // Pointer tilt (subtle).
    const tilt = { x: 0, y: 0, tx: 0, ty: 0 };
    const onPointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      tilt.tx = ((e.clientY - rect.top) / rect.height - 0.5) * 0.25;
      tilt.ty = ((e.clientX - rect.left) / rect.width - 0.5) * 0.35;
    };
    const onPointerLeave = () => {
      tilt.tx = 0;
      tilt.ty = 0;
    };
    container.addEventListener("pointermove", onPointerMove);
    container.addEventListener("pointerleave", onPointerLeave);

    const current = { ...PROFILES.idle };
    const clock = new THREE.Clock();
    let elapsed = 0;
    let sinceFrame = 0;
    let frame = 0;
    let running = false;
    let onScreen = true;

    const renderFrame = (dt: number) => {
      const target = PROFILES[stateRef.current] || PROFILES.idle;
      const k = 1 - Math.exp(-dt * 3); // smooth transitions between states
      current.spin += (target.spin - current.spin) * k;
      current.pulse += (target.pulse - current.pulse) * k;
      current.glow += (target.glow - current.glow) * k;
      elapsed += dt;

      root.rotation.y += current.spin * dt;
      lattice.rotation.y -= current.spin * 0.45 * dt;
      lattice.rotation.x = Math.sin(elapsed * 0.2) * 0.15;
      core.rotation.x += current.spin * 0.3 * dt;
      tilt.x += (tilt.tx - tilt.x) * k;
      tilt.y += (tilt.ty - tilt.y) * k;
      scene.rotation.x = tilt.x;
      scene.rotation.y = tilt.y;

      const pulse = 1 + current.pulse * Math.sin(elapsed * 4.2);
      ring.scale.setScalar(pulse);
      coreMaterial.emissiveIntensity = current.glow * (0.75 + 0.25 * Math.sin(elapsed * 5));
      renderer.render(scene, camera);
    };

    const loop = () => {
      if (!running) return;
      frame = requestAnimationFrame(loop);
      const dt = Math.min(clock.getDelta(), 0.1);
      sinceFrame += dt;
      if (sinceFrame < 1 / MAX_FPS) return;
      renderFrame(sinceFrame);
      sinceFrame = 0;
    };

    const updateRunning = () => {
      const shouldRun = !reduceMotion && onScreen && document.visibilityState === "visible";
      if (shouldRun && !running) {
        running = true;
        clock.getDelta();
        frame = requestAnimationFrame(loop);
      } else if (!shouldRun && running) {
        running = false;
        cancelAnimationFrame(frame);
      }
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    const intersection = new IntersectionObserver((entries) => {
      onScreen = entries[0]?.isIntersecting ?? true;
      updateRunning();
    });
    intersection.observe(container);
    document.addEventListener("visibilitychange", updateRunning);

    resize();
    renderFrame(0.016);
    updateRunning();

    return () => {
      running = false;
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      intersection.disconnect();
      document.removeEventListener("visibilitychange", updateRunning);
      container.removeEventListener("pointermove", onPointerMove);
      container.removeEventListener("pointerleave", onPointerLeave);
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        mesh.geometry?.dispose();
        const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(material)) material.forEach((mat) => mat.dispose());
        else material?.dispose();
      });
      envTexture.dispose();
      pmrem.dispose();
      roomEnv.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        mesh.geometry?.dispose();
        (mesh.material as THREE.Material | undefined)?.dispose?.();
      });
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label={label}
      className={`relative h-full w-full select-none ${className}`}
    >
      {webglFailed && (
        <div className="absolute inset-0 flex items-center justify-center">
          <EmblemMark size={160} />
        </div>
      )}
    </div>
  );
}
