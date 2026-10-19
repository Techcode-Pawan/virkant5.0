"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, CheckCircle2 } from "lucide-react";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [done, setDone] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === confirmPassword) {
      setDone(true);
      setTimeout(() => router.push("/login"), 1500);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-16 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-txt-primary">
          Set New Password
        </h1>
        <p className="text-xs text-txt-muted">
          Choose a secure passphrase for your industrial console access
        </p>
      </div>

      <div className="rounded-xl border border-border-subtle bg-surface p-6 sm:p-8 shadow-sm">
        {done ? (
          <div className="text-center space-y-3 py-4">
            <CheckCircle2 className="h-10 w-10 text-success mx-auto" />
            <h3 className="font-semibold text-sm text-txt-primary">Password Updated</h3>
            <p className="text-xs text-txt-muted">Redirecting to login console...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-txt-muted mb-1">
                New Password
              </label>
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

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-txt-muted mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-txt-muted" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-md border border-border-subtle bg-elevated/50 pl-9 pr-3.5 py-2 text-sm text-txt-primary focus:outline-none focus:border-teal"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full rounded-md bg-brand py-2.5 text-sm font-semibold text-white shadow-xs hover:opacity-90"
            >
              Update Password
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
