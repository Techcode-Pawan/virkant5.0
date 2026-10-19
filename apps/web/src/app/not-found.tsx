"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center space-y-4">
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-elevated text-warning">
        <AlertCircle className="h-6 w-6" />
      </div>
      <h1 className="text-2xl font-bold tracking-tight text-txt-primary">
        Page Not Found (404)
      </h1>
      <p className="text-xs text-txt-muted leading-relaxed">
        The requested technical resource, equipment manual, or system route does not exist.
      </p>
      <div className="pt-2">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-md bg-brand px-4 py-2 text-xs font-semibold text-white shadow-xs hover:opacity-90"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Return to Safety Console</span>
        </Link>
      </div>
    </div>
  );
}
