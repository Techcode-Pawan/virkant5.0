"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShieldCheck,
  FileText,
  Cpu,
  MessageSquare,
  Sun,
  Moon,
  Contrast,
  Languages,
  Menu,
  X,
  LayoutDashboard,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { siteConfig } from "@/lib/config";

export default function Navbar() {
  const pathname = usePathname();
  const { locale, setLocale, t } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isDashboardRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/chat") ||
    pathname.startsWith("/documents") ||
    pathname.startsWith("/machines") ||
    pathname.startsWith("/analytics") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/settings");

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border-subtle bg-surface/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Wordmark & CAD crosshair badge */}
        <Link href="/" className="flex items-center space-x-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-white shadow-sm font-mono font-bold text-base">
            <span className="text-teal">F</span>W
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-base tracking-tight text-txt-primary">
                {siteConfig.brandName}
              </span>
              <span className="rounded bg-teal/15 px-1 py-0.2 font-mono text-[10px] font-semibold text-teal uppercase">
                v1.0
              </span>
            </div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-txt-muted">
              Industrial Assistant
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
          {!isDashboardRoute ? (
            <>
              <Link
                href="/features"
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  pathname === "/features"
                    ? "bg-elevated text-txt-primary"
                    : "text-txt-muted hover:text-txt-primary hover:bg-elevated/50"
                }`}
              >
                {t("nav.features")}
              </Link>
              <Link
                href="/security"
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  pathname === "/security"
                    ? "bg-elevated text-txt-primary"
                    : "text-txt-muted hover:text-txt-primary hover:bg-elevated/50"
                }`}
              >
                {t("nav.security")}
              </Link>
              <Link
                href="/dashboard"
                className="px-3 py-1.5 text-sm font-medium rounded-md text-txt-muted hover:text-txt-primary hover:bg-elevated/50"
              >
                {t("nav.dashboard")}
              </Link>
              <Link
                href="/chat"
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md bg-teal/10 text-teal hover:bg-teal/20"
              >
                <MessageSquare className="h-4 w-4" />
                {t("nav.chat")}
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/dashboard"
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  pathname === "/dashboard"
                    ? "bg-elevated text-txt-primary font-semibold"
                    : "text-txt-muted hover:text-txt-primary"
                }`}
              >
                <LayoutDashboard className="h-4 w-4" />
                {t("nav.dashboard")}
              </Link>
              <Link
                href="/chat"
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  pathname === "/chat"
                    ? "bg-elevated text-txt-primary font-semibold"
                    : "text-txt-muted hover:text-txt-primary"
                }`}
              >
                <MessageSquare className="h-4 w-4" />
                {t("nav.chat")}
              </Link>
              <Link
                href="/documents"
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  pathname === "/documents"
                    ? "bg-elevated text-txt-primary font-semibold"
                    : "text-txt-muted hover:text-txt-primary"
                }`}
              >
                <FileText className="h-4 w-4" />
                {t("nav.documents")}
              </Link>
              <Link
                href="/machines"
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  pathname === "/machines"
                    ? "bg-elevated text-txt-primary font-semibold"
                    : "text-txt-muted hover:text-txt-primary"
                }`}
              >
                <Cpu className="h-4 w-4" />
                {t("nav.machines")}
              </Link>
            </>
          )}
        </nav>

        {/* Global Controls: Language Switcher, Theme Toggle, Auth CTA */}
        <div className="hidden sm:flex items-center space-x-2">
          {/* Language Selector */}
          <div className="flex items-center rounded-md border border-border-subtle bg-elevated p-0.5">
            <button
              onClick={() => setLocale("en")}
              className={`px-2 py-1 text-xs font-mono rounded ${
                locale === "en"
                  ? "bg-surface text-txt-primary font-semibold shadow-xs"
                  : "text-txt-muted hover:text-txt-primary"
              }`}
            >
              EN
            </button>
            <button
              onClick={() => setLocale("hi")}
              className={`px-2 py-1 text-xs font-mono rounded ${
                locale === "hi"
                  ? "bg-surface text-txt-primary font-semibold shadow-xs"
                  : "text-txt-muted hover:text-txt-primary"
              }`}
            >
              हिन्दी
            </button>
          </div>

          {/* Theme Switcher Toggle */}
          <button
            onClick={toggleTheme}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border-subtle bg-elevated text-txt-muted hover:text-txt-primary"
            aria-label="Toggle visual theme"
          >
            {theme === "light" && <Sun className="h-4 w-4" />}
            {theme === "dark" && <Moon className="h-4 w-4" />}
            {theme === "high-contrast" && <Contrast className="h-4 w-4 text-warning" />}
          </button>

          {/* Sign In CTA */}
          <Link
            href="/login"
            className="rounded-md bg-brand px-3.5 py-1.5 text-sm font-medium text-white shadow-xs hover:opacity-90"
          >
            {t("nav.login")}
          </Link>
        </div>

        {/* Mobile menu button */}
        <div className="flex sm:hidden items-center space-x-2">
          <button
            onClick={toggleTheme}
            className="flex h-8 w-8 items-center justify-center rounded border border-border-subtle"
          >
            {theme === "light" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-md border border-border-subtle text-txt-primary"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-b border-border-subtle bg-surface px-4 py-3 space-y-2">
          <div className="flex space-x-2 pb-2 border-b border-border-subtle">
            <button
              onClick={() => setLocale("en")}
              className={`flex-1 py-1 text-center text-xs font-mono rounded ${
                locale === "en" ? "bg-brand text-white" : "bg-elevated text-txt-muted"
              }`}
            >
              English
            </button>
            <button
              onClick={() => setLocale("hi")}
              className={`flex-1 py-1 text-center text-xs font-mono rounded ${
                locale === "hi" ? "bg-brand text-white" : "bg-elevated text-txt-muted"
              }`}
            >
              हिंदी
            </button>
          </div>
          <Link
            href="/dashboard"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-1.5 text-sm font-medium text-txt-primary"
          >
            {t("nav.dashboard")}
          </Link>
          <Link
            href="/chat"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-1.5 text-sm font-medium text-teal"
          >
            {t("nav.chat")}
          </Link>
          <Link
            href="/documents"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-1.5 text-sm font-medium text-txt-primary"
          >
            {t("nav.documents")}
          </Link>
          <Link
            href="/machines"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-1.5 text-sm font-medium text-txt-primary"
          >
            {t("nav.machines")}
          </Link>
          <Link
            href="/login"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-1.5 text-sm font-medium text-txt-primary"
          >
            {t("nav.login")}
          </Link>
        </div>
      )}
    </header>
  );
}
