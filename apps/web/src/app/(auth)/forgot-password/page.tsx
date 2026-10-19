"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Mail, CheckCircle2, ArrowLeft } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
  };

  return (
    <div className="mx-auto max-w-md px-4 py-16 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-txt-primary">
          Password Recovery
        </h1>
        <p className="text-xs text-txt-muted">
          Enter your authorized organization email to receive recovery instructions
        </p>
      </div>

      <div className="rounded-xl border border-border-subtle bg-surface p-6 sm:p-8 shadow-sm">
        {sent ? (
          <div className="text-center space-y-3 py-4">
            <CheckCircle2 className="h-10 w-10 text-success mx-auto" />
            <h3 className="font-semibold text-sm text-txt-primary">Recovery Link Dispatched</h3>
            <p className="text-xs text-txt-muted">
              If an active account exists for {email}, a secure password reset link has been dispatched.
            </p>
            <div className="pt-2">
              <Link href="/login" className="text-xs text-teal font-medium hover:underline inline-flex items-center gap-1">
                <ArrowLeft className="h-3.5 w-3.5" /> Back to Sign In
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-txt-muted mb-1">
                Work Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-txt-muted" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="technician@plant.internal"
                  className="w-full rounded-md border border-border-subtle bg-elevated/50 pl-9 pr-3.5 py-2 text-sm text-txt-primary focus:outline-none focus:border-teal"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full rounded-md bg-brand py-2.5 text-sm font-semibold text-white shadow-xs hover:opacity-90"
            >
              Send Recovery Email
            </button>

            <div className="text-center pt-2">
              <Link href="/login" className="text-xs text-txt-muted hover:text-txt-primary inline-flex items-center gap-1">
                <ArrowLeft className="h-3.5 w-3.5" /> Return to Sign In
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
