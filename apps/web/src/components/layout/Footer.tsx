"use client";

import React from "react";
import Link from "next/link";
import { ShieldCheck, HardHat, ExternalLink } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { siteConfig } from "@/lib/config";

export default function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-border-subtle bg-surface text-txt-muted text-xs">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand & Purpose */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-sm text-txt-primary">
                {siteConfig.brandName}
              </span>
              <span className="rounded bg-teal/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-teal">
                PLATFORM
              </span>
            </div>
            <p className="text-xs leading-relaxed text-txt-muted">
              Production-grade industrial multimodal knowledge platform for Standard Operating Procedures, OEM manuals, and frontline engineering intelligence.
            </p>
            <div className="flex items-center gap-1.5 text-xs text-warning">
              <HardHat className="h-4 w-4" />
              <span>Safety Critical Support System</span>
            </div>
          </div>

          {/* Platform Navigation */}
          <div>
            <h4 className="font-semibold text-xs text-txt-primary uppercase tracking-wider mb-3">
              Platform Modules
            </h4>
            <ul className="space-y-2">
              <li>
                <Link href="/dashboard" className="hover:text-txt-primary transition-colors">
                  {t("nav.dashboard")}
                </Link>
              </li>
              <li>
                <Link href="/chat" className="hover:text-txt-primary transition-colors">
                  {t("nav.chat")}
                </Link>
              </li>
              <li>
                <Link href="/documents" className="hover:text-txt-primary transition-colors">
                  {t("nav.documents")}
                </Link>
              </li>
              <li>
                <Link href="/machines" className="hover:text-txt-primary transition-colors">
                  {t("nav.machines")}
                </Link>
              </li>
              <li>
                <Link href="/analytics" className="hover:text-txt-primary transition-colors">
                  {t("nav.analytics")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Compliance & Security */}
          <div>
            <h4 className="font-semibold text-xs text-txt-primary uppercase tracking-wider mb-3">
              Security & Architecture
            </h4>
            <ul className="space-y-2">
              <li>
                <Link href="/security" className="hover:text-txt-primary transition-colors">
                  Cybersecurity Posture
                </Link>
              </li>
              <li>
                <Link href="/features" className="hover:text-txt-primary transition-colors">
                  Hybrid RAG & Vision
                </Link>
              </li>
              <li>
                <a
                  href="http://localhost:8000/docs"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 hover:text-txt-primary transition-colors"
                >
                  <span>FastAPI Swagger Spec</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </li>
            </ul>
          </div>

          {/* Legal & Governance */}
          <div>
            <h4 className="font-semibold text-xs text-txt-primary uppercase tracking-wider mb-3">
              Governance & Legal
            </h4>
            <ul className="space-y-2">
              <li>
                <Link href="/legal/privacy" className="hover:text-txt-primary transition-colors">
                  {t("nav.privacy")}
                </Link>
              </li>
              <li>
                <Link href="/legal/terms" className="hover:text-txt-primary transition-colors">
                  {t("nav.terms")}
                </Link>
              </li>
              <li>
                <Link href="/legal/data-declaration" className="hover:text-txt-primary transition-colors">
                  {t("nav.dataDeclaration")}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Safety Disclaimer Banner */}
        <div className="mt-8 pt-6 border-t border-border-subtle flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[11px] text-txt-muted text-center sm:text-left">
            Notice: Generated guidance is decision-support material. All personnel must follow approved physical plant SOPs and Lockout/Tagout (LOTO) protocols prior to operating equipment.
          </p>
          <div className="font-mono text-[11px] text-txt-muted">
            Vikrant 5.0 Platform • {new Date().getFullYear()}
          </div>
        </div>
      </div>
    </footer>
  );
}
