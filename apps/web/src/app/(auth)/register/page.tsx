"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building, Lock, Mail, ArrowRight, User } from "lucide-react";
import { siteConfig } from "@/lib/config";

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    fullName: "",
    orgName: "",
    email: "",
    password: "",
    acceptTerms: false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.acceptTerms) return;
    if (typeof window !== "undefined") {
      localStorage.setItem("forgewise_auth_token", "mock-org_admin:admin-new:new-org");
      localStorage.setItem("forgewise_user_role", "org_admin");
    }
    router.push("/dashboard");
  };

  return (
    <div className="mx-auto max-w-md px-4 py-16 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-txt-primary">
          Register Plant Organization
        </h1>
        <p className="text-xs text-txt-muted">
          Provision a dedicated multi-tenant industrial knowledge vault
        </p>
      </div>

      <div className="rounded-xl border border-border-subtle bg-surface p-6 sm:p-8 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-txt-muted mb-1">
              Organization / Facility Name
            </label>
            <div className="relative">
              <Building className="absolute left-3 top-2.5 h-4 w-4 text-txt-muted" />
              <input
                type="text"
                required
                value={formData.orgName}
                onChange={(e) => setFormData({ ...formData, orgName: e.target.value })}
                placeholder="Vikrant Forge Works"
                className="w-full rounded-md border border-border-subtle bg-elevated/50 pl-9 pr-3.5 py-2 text-sm text-txt-primary focus:outline-none focus:border-teal"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-txt-muted mb-1">
              Administrator Full Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 h-4 w-4 text-txt-muted" />
              <input
                type="text"
                required
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="Marcus Cole"
                className="w-full rounded-md border border-border-subtle bg-elevated/50 pl-9 pr-3.5 py-2 text-sm text-txt-primary focus:outline-none focus:border-teal"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-txt-muted mb-1">
              Work Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-txt-muted" />
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="m.cole@vikrant.internal"
                className="w-full rounded-md border border-border-subtle bg-elevated/50 pl-9 pr-3.5 py-2 text-sm text-txt-primary focus:outline-none focus:border-teal"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-txt-muted mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-txt-muted" />
              <input
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••••••"
                className="w-full rounded-md border border-border-subtle bg-elevated/50 pl-9 pr-3.5 py-2 text-sm text-txt-primary focus:outline-none focus:border-teal"
              />
            </div>
          </div>

          <div className="flex items-start gap-2 pt-1">
            <input
              type="checkbox"
              id="terms"
              required
              checked={formData.acceptTerms}
              onChange={(e) => setFormData({ ...formData, acceptTerms: e.target.checked })}
              className="mt-1 rounded border-border-subtle text-teal focus:ring-teal"
            />
            <label htmlFor="terms" className="text-xs text-txt-muted leading-relaxed">
              I agree to the{" "}
              <Link href="/legal/terms" className="text-teal hover:underline">
                Terms of Use
              </Link>{" "}
              and acknowledge the{" "}
              <Link href="/legal/privacy" className="text-teal hover:underline">
                Privacy Policy
              </Link>
              .
            </label>
          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 rounded-md bg-brand py-2.5 text-sm font-semibold text-white shadow-xs hover:opacity-90 transition-opacity"
          >
            <span>Register Organization</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        <div className="text-center text-xs text-txt-muted pt-4 border-t border-border-subtle mt-4">
          Already registered?{" "}
          <Link href="/login" className="text-teal font-medium hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
