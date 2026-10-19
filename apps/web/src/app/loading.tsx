import React from "react";

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
      <div className="h-8 w-8 rounded-full border-2 border-teal border-t-transparent animate-spin" />
      <span className="font-mono text-xs uppercase tracking-wider text-txt-muted">
        Loading Facility Knowledge System...
      </span>
    </div>
  );
}
