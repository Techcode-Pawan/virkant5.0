"use client";

import React, { useCallback, useEffect, useState } from "react";
import { RefreshCw, WifiOff } from "lucide-react";
import { fetchApi } from "@/lib/api-client";
import type { HealthStatus } from "@/types";

type Problem = null | "offline" | "api" | "database";

/** Shows a banner only when something is actually wrong (browser offline, API down, DB down). */
export default function ConnectionBanner() {
  const [problem, setProblem] = useState<Problem>(null);
  const [checking, setChecking] = useState(false);

  const check = useCallback(async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setProblem("offline");
      return;
    }
    setChecking(true);
    try {
      const health = await fetchApi<HealthStatus>("/api/v1/health", { timeoutMs: 8000 });
      setProblem(health.database.status === "connected" ? null : "database");
    } catch {
      setProblem("api");
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    check();
    // Poll faster while there is a problem so recovery shows up quickly.
    const timer = window.setInterval(() => document.visibilityState === "visible" && check(), problem ? 10_000 : 45_000);
    window.addEventListener("online", check);
    window.addEventListener("offline", check);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("online", check);
      window.removeEventListener("offline", check);
    };
  }, [check, problem]);

  if (!problem) return null;
  const text = {
    offline: "You are offline. Changes and questions will not be sent until the connection returns.",
    api: "Cannot reach the ForgeWise API. Retrying automatically.",
    database: "The database is unreachable. Nothing new can be saved until it reconnects.",
  }[problem];

  return (
    <div role="status" className="flex items-center gap-3 border-b border-warning/30 bg-warning/[0.08] px-4 py-2 text-sm text-txt-primary sm:px-6">
      <WifiOff className="h-4 w-4 shrink-0 text-warning" />
      <span className="min-w-0 flex-1">{text}</span>
      <button onClick={check} disabled={checking} className="btn-ghost h-7 px-2 text-xs">
        <RefreshCw className={`h-3.5 w-3.5 ${checking ? "animate-spin" : ""}`} />
        Retry now
      </button>
    </div>
  );
}
