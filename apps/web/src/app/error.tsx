"use client";

import React, { useEffect } from "react";
import { RotateCcw } from "lucide-react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Client error boundary:", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-md px-4 py-24">
      <h1 className="text-xl font-semibold">This page failed to load</h1>
      <p className="mt-2 text-sm text-txt-muted">
        An unexpected error occurred while rendering. Your saved data is not affected. Try again, and if it keeps happening, reload the app.
      </p>
      <button onClick={() => reset()} className="btn-primary mt-6">
        <RotateCcw className="h-4 w-4" /> Try again
      </button>
    </div>
  );
}
