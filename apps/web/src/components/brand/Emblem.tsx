"use client";

import dynamic from "next/dynamic";
import EmblemMark from "./EmblemMark";
import type { EmblemState } from "./AIEmblem3D";

/** Three.js is loaded on demand; the flat mark shows instantly in the same spot. */
const AIEmblem3D = dynamic(() => import("./AIEmblem3D"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center">
      <EmblemMark size={120} className="opacity-60" />
    </div>
  ),
});

export type { EmblemState };

export default function Emblem(props: { state?: EmblemState; className?: string; label?: string }) {
  return <AIEmblem3D {...props} />;
}
