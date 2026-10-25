"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { InlineAlert, Spinner } from "@/components/ui/primitives";
import { errorMessage } from "@/lib/api-client";
import { siteConfig } from "@/lib/config";
import { useTranslation } from "@/lib/i18n";
import { useSession } from "@/lib/session";
import type { LanguageCode, UserRole } from "@/types";

const ROLES: { id: UserRole; label: string }[] = [
  { id: "operator", label: "Operator" },
  { id: "engineer", label: "Engineer" },
  { id: "knowledge_manager", label: "Knowledge manager" },
  { id: "org_admin", label: "Org admin" },
];

const DEMO_ACCOUNTS: { role: UserRole; name: string; email: string }[] = [
  { role: "operator", name: "Rajesh Sharma", email: "operator.rajesh@vikrant.internal" },
  { role: "engineer", name: "Elena Rostova", email: "engineer.elena@vikrant.internal" },
  { role: "org_admin", name: "Marcus Vance", email: "admin.marcus@vikrant.internal" },
];

export default function SignInForm({ mode }: { mode: "signin" | "register" }) {
  const router = useRouter();
  const params = useSearchParams();
  const { locale, setLocale } = useTranslation();
  const { signIn } = useSession();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<UserRole>("operator");
  const [language, setLanguage] = useState<LanguageCode>(locale);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const next = params?.get("next");
  const destination = next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  const submit = async (key: string, emailValue: string, roleValue: UserRole, name?: string) => {
    setBusy(key);
    setError(null);
    try {
      await signIn(emailValue, roleValue, language, { fullName: name, newWorkspace: false });
      setLocale(language);
      router.replace(destination);
    } catch (err) {
      setError(errorMessage(err, "Sign-in failed."));
      setBusy(null);
    }
  };

  return (
    <div className="w-full max-w-[400px]">
      <h1 className="text-[1.375rem] font-semibold tracking-[-0.01em]">
        {mode === "signin" ? `Sign in to ${siteConfig.brandName}` : "Create your account"}
      </h1>
      <p className="mt-1.5 text-sm text-txt-muted">
        {mode === "signin"
          ? "Use your work e-mail. You return to your most recent workspace and history."
          : "Your account and a private workspace are created on first sign-in."}
      </p>

      <form
        className="mt-6 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit("form", email, role, fullName || undefined);
        }}
      >
        {mode === "register" && (
          <div>
            <label className="label" htmlFor="name">Full name</label>
            <input id="name" className="field" value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" />
          </div>
        )}
        <div>
          <label className="label" htmlFor="email">Work e-mail</label>
          <input
            id="email"
            type="email"
            required
            className="field"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="name@company.com"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="role">Role</label>
            <select id="role" className="field" value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
              {ROLES.map((r) => (
                <option key={r.id} value={r.id}>{r.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="lang">Language</label>
            <select id="lang" className="field" value={language} onChange={(e) => setLanguage(e.target.value as LanguageCode)}>
              {siteConfig.supportedLanguages.map((l) => (
                <option key={l} value={l}>{siteConfig.languageNames[l]}</option>
              ))}
            </select>
          </div>
        </div>

        {error && <InlineAlert tone="danger">{error}</InlineAlert>}

        <button type="submit" disabled={!!busy} className="btn-primary h-10 w-full">
          {busy === "form" && <Spinner />}
          {mode === "signin" ? "Sign in" : "Create account"}
        </button>
        <p className="text-xs text-txt-faint">
          Passwordless sign-in for local and pilot deployments. Roles are self-selected unless the server sets ALLOW_ROLE_SELF_SELECT=false.
        </p>
      </form>

      {mode === "signin" && (
        <div className="mt-8 border-t border-border-subtle pt-6">
          <p className="text-sm font-medium">Demo accounts</p>
          <div className="mt-3 divide-y divide-border-subtle rounded-lg border border-border-subtle">
            {DEMO_ACCOUNTS.map((a) => (
              <button
                key={a.email}
                type="button"
                disabled={!!busy}
                onClick={() => submit(a.email, a.email, a.role, a.name)}
                className="flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left hover:bg-elevated/60 disabled:opacity-60"
              >
                <span className="min-w-0">
                  <span className="block text-sm text-txt-primary">{a.name}</span>
                  <span className="block truncate text-xs text-txt-muted">{a.email}</span>
                </span>
                {busy === a.email ? <Spinner /> : <span className="text-xs text-txt-faint">{ROLES.find((r) => r.id === a.role)?.label}</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="mt-6 text-sm text-txt-muted">
        {mode === "signin" ? (
          <>No account yet? <Link href="/register" className="text-accent hover:underline">Create one</Link></>
        ) : (
          <>Already have an account? <Link href="/login" className="text-accent hover:underline">Sign in</Link></>
        )}
      </p>
    </div>
  );
}
