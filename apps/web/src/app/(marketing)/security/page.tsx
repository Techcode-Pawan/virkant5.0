"use client";

import React from "react";
import Link from "next/link";
import { Lock, ShieldCheck, Key, Database, FileText, CheckCircle2 } from "lucide-react";

export default function SecurityPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      <div className="max-w-2xl space-y-3">
        <span className="font-mono text-xs font-semibold uppercase tracking-wider text-teal">
          Enterprise Cybersecurity & Governance
        </span>
        <h1 className="text-3xl font-bold tracking-tight text-txt-primary">
          Industrial Defense-in-Depth Posture
        </h1>
        <p className="text-sm sm:text-base text-txt-muted leading-relaxed">
          Proprietary machine manuals and operating SOPs represent critical intellectual property. Here is how ForgeWise AI protects plant knowledge.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="rounded-xl border border-border-subtle bg-surface p-6 space-y-3">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-teal" />
            <h3 className="font-semibold text-base text-txt-primary">
              Strict Multi-Tenant Isolation
            </h3>
          </div>
          <p className="text-xs text-txt-muted leading-relaxed">
            Every database query incorporates organization-level filtering at the repository layer. PostgreSQL Row Level Security (RLS) ensures that tenant documents, vectors, and chat history remain completely segregated.
          </p>
        </div>

        <div className="rounded-xl border border-border-subtle bg-surface p-6 space-y-3">
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-teal" />
            <h3 className="font-semibold text-base text-txt-primary">
              Cryptographic JWT Verification
            </h3>
          </div>
          <p className="text-xs text-txt-muted leading-relaxed">
            All protected endpoints strictly validate incoming bearer tokens using RS256/HS256 algorithms. Unverified client claims in request bodies are discarded.
          </p>
        </div>

        <div className="rounded-xl border border-border-subtle bg-surface p-6 space-y-3">
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-teal" />
            <h3 className="font-semibold text-base text-txt-primary">
              Private Object Storage & Expiring Signed URLs
            </h3>
          </div>
          <p className="text-xs text-txt-muted leading-relaxed">
            Uploaded manuals are stored in private storage buckets with zero public access. Document page previews are generated on demand via time-limited HMAC-signed URLs expiring in 15 minutes.
          </p>
        </div>

        <div className="rounded-xl border border-border-subtle bg-surface p-6 space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-teal" />
            <h3 className="font-semibold text-base text-txt-primary">
              Sliding-Window Rate Limiting
            </h3>
          </div>
          <p className="text-xs text-txt-muted leading-relaxed">
            Redis-backed sliding window rate limiters restrict abusive request patterns, preventing denial-of-service attempts and protecting expensive multimodal inference budgets.
          </p>
        </div>
      </div>
    </div>
  );
}
