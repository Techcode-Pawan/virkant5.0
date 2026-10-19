"use client";

import React, { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Runtime client boundary error:", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center space-y-4">
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-danger/10 text-danger">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <h1 className="text-2xl font-bold tracking-tight text-txt-primary">
        Operational Exception Detected
      </h1>
      <p className="text-xs text-txt-muted leading-relaxed">
        A client-side interface fault occurred. An event diagnostic has been logged.
      </p>
      <div className="pt-2">
        <button
          onClick={() => reset()}
          className="inline-flex items-center gap-1.5 rounded-md bg-brand px-4 py-2 text-xs font-semibold text-white shadow-xs hover:opacity-90"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Reload Interface State</span>
        </button>
      </div>
    </div>
  );
}
