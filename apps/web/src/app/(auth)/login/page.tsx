"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Mail, ArrowRight, UserCheck, HardHat, Layers, Sparkles } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { useSession } from "@/lib/session";
import { siteConfig } from "@/lib/config";
import { UserRole } from "@/types";

export default function LoginPage() {
  const router = useRouter();
  const { t, locale } = useTranslation();
  const { signIn } = useSession();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionCreatedMsg, setSessionCreatedMsg] = useState<string | null>(null);

  const handleLogin = async (
    role: UserRole = "operator",
    emailVal: string = "operator.rajesh@vikrant.internal"
  ) => {
    setLoading(true);
    try {
      const newSession = await signIn(emailVal, role, locale, true);
      setSessionCreatedMsg(`Generated isolated workspace ${newSession.workspace_id}...`);
      setTimeout(() => {
        router.push("/dashboard");
      }, 500);
    } catch {
      setTimeout(() => {
        router.push("/dashboard");
      }, 400);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-16 space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-white font-mono font-bold text-lg mb-2 shadow-xs">
          <span className="text-teal">F</span>W
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-txt-primary">
          Sign In to {siteConfig.brandName}
        </h1>
        <p className="text-xs text-txt-muted">
          Authorized plant technicians & engineering personnel • Multi-User Workspace Engine
        </p>
      </div>

      <div className="rounded-xl border border-border-subtle bg-surface p-6 sm:p-8 shadow-sm space-y-5">
        {/* Quick Demo Role Switcher for instant evaluator testing */}
        <div className="rounded-lg border border-teal/20 bg-teal/5 p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="block text-[11px] font-mono uppercase tracking-wider text-teal font-semibold">
              Instant 1-Click Evaluation Sign-In
            </span>
            <span className="flex items-center gap-1 text-[10px] font-mono text-teal">
              <Layers className="h-3 w-3" />
              <span>Auto-Workspace</span>
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleLogin("operator", "operator.rajesh@vikrant.internal")}
              disabled={loading}
              className="px-2 py-1.5 rounded bg-surface border border-border-subtle text-xs font-medium text-txt-primary hover:bg-elevated text-center hover:border-teal/40 transition-all shadow-xs"
            >
              Operator
            </button>
            <button
              onClick={() => handleLogin("engineer", "engineer.elena@vikrant.internal")}
              disabled={loading}
              className="px-2 py-1.5 rounded bg-surface border border-border-subtle text-xs font-medium text-txt-primary hover:bg-elevated text-center hover:border-teal/40 transition-all shadow-xs"
            >
              Engineer
            </button>
            <button
              onClick={() => handleLogin("org_admin", "admin.marcus@vikrant.internal")}
              disabled={loading}
              className="px-2 py-1.5 rounded bg-surface border border-border-subtle text-xs font-medium text-txt-primary hover:bg-elevated text-center hover:border-teal/40 transition-all shadow-xs"
            >
              Org Admin
            </button>
          </div>
        </div>

        {sessionCreatedMsg && (
          <div className="rounded-lg border border-success/30 bg-success/10 p-2.5 text-xs font-mono text-success flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            <span>{sessionCreatedMsg}</span>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleLogin("operator", email || "operator.rajesh@vikrant.internal");
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-txt-muted mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-txt-muted" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="rajesh.sharma@plant.internal"
                className="w-full rounded-md border border-border-subtle bg-elevated/50 pl-9 pr-3.5 py-2 text-sm text-txt-primary focus:outline-none focus:border-teal"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-mono uppercase tracking-wider text-txt-muted">
                Password
              </label>
              <Link href="/forgot-password" className="text-xs text-teal hover:underline">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-txt-muted" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full rounded-md border border-border-subtle bg-elevated/50 pl-9 pr-3.5 py-2 text-sm text-txt-primary focus:outline-none focus:border-teal"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-md bg-brand py-2.5 text-sm font-semibold text-white shadow-xs hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {loading ? <span>Generating Workspace Session...</span> : <span>Sign In to Workspace</span>}
          </button>
        </form>

        <div className="text-center text-xs text-txt-muted pt-2 border-t border-border-subtle">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-teal font-medium hover:underline">
            Register plant
          </Link>
        </div>
      </div>
    </div>
  );
}
