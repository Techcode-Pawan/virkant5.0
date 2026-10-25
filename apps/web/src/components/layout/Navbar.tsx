"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MessageSquare,
  LayoutDashboard,
  FileText,
  Cpu,
  Layers,
  Sparkles,
  BarChart3,
  Shield,
  Settings as SettingsIcon,
  ChevronDown,
  Plus,
  Check,
  Sun,
  Moon,
  Contrast,
  Cloud,
  Activity,
} from "lucide-react";
import FWLogo from "./FWLogo";
import RoleBadge from "./RoleBadge";
import { useSession } from "@/lib/session";
import { useTranslation } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { siteConfig } from "@/lib/config";
import { AIModelCode, UserRole } from "@/types";

export default function Navbar() {
  const pathname = usePathname();
  const {
    session,
    activeWorkspaceId,
    selectedModel,
    setSelectedModel,
    selectedLanguage,
    createNewWorkspace,
    signIn,
  } = useSession();

  const { theme, toggleTheme } = useTheme();

  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // All core navigation links prominently featured in top navigation
  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/chat", label: "AI Assistant", icon: MessageSquare, highlight: true },
    { href: "/documents", label: "SOP Library", icon: FileText },
    { href: "/machines", label: "Equipments", icon: Cpu },
    { href: "/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/admin", label: "Admin Panel", icon: Shield, minRole: "org_admin" },
    { href: "/settings", label: "Settings", icon: SettingsIcon },
  ];

  const quickRoles: { role: UserRole; name: string; email: string }[] = [
    { role: "operator", name: "Rajesh Sharma", email: "operator.rajesh@vikrant.internal" },
    { role: "engineer", name: "Elena Rostova", email: "engineer.elena@vikrant.internal" },
    { role: "org_admin", name: "Marcus Vance", email: "admin.marcus@vikrant.internal" },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border-subtle bg-surface/95 backdrop-blur-md transition-colors shadow-xs">
      <div className="mx-auto flex h-16 w-full items-center justify-between px-3 sm:px-6 lg:px-8 gap-3">
        {/* Left: Brand Wordmark & Powered By AI Branding */}
        <div className="flex items-center space-x-3 shrink-0">
          <Link href="/" className="flex items-center space-x-2.5 group">
            <FWLogo size={34} />
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm sm:text-base tracking-tight text-txt-primary group-hover:text-teal transition-colors">
                  {siteConfig.brandName}
                </span>
                <span className="rounded bg-teal/15 px-1 py-0.2 font-mono text-[9px] font-semibold text-teal uppercase border border-teal/20">
                  v5.0
                </span>
              </div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-txt-muted hidden md:inline">
                Precision Industrial Copilot
              </span>
            </div>
          </Link>

          {/* Sleek 'Powered by AI' Badge in Top Header */}
          <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-teal/30 bg-teal/5 px-2.5 py-0.5 text-[10px] font-mono text-teal shadow-2xs">
            <Sparkles className="h-3 w-3 text-teal animate-pulse" />
            <span className="font-semibold tracking-wide">Powered by AI</span>
          </div>
        </div>

        {/* Center: Top Navigation Bar with All Core Navigation Links (No Sidebar, No Drawers) */}
        <nav className="flex items-center overflow-x-auto no-scrollbar py-1 space-x-1 rounded-full border border-border-subtle bg-elevated/40 p-1 text-xs">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-brand text-white shadow-xs font-semibold"
                    : "text-txt-muted hover:text-txt-primary hover:bg-elevated/80"
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? "text-teal" : ""}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right: Cloud/Model Indicators, Active Workspace & Role Switcher */}
        <div className="flex items-center space-x-2 shrink-0">
          {/* Subtle Cloud / Gemini Status Indicator */}
          <div className="hidden lg:flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-2.5 py-1 font-mono text-[11px] text-success shadow-2xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
            </span>
            <Cloud className="h-3.5 w-3.5" />
            <span className="font-semibold">
              {selectedModel.toLowerCase().includes("gemini") ? "Gemini 2.5 • Cloud Grounded" : "Cloud Grounded"}
            </span>
          </div>

          {/* Active Workspace Chip */}
          <div className="hidden md:flex items-center gap-1 rounded-lg border border-border-subtle bg-elevated/50 px-2 py-1 font-mono text-[11px] text-txt-muted">
            <Layers className="h-3.5 w-3.5 text-teal shrink-0" />
            <span className="text-txt-primary font-bold">{activeWorkspaceId}</span>
            <button
              onClick={() => createNewWorkspace()}
              className="ml-0.5 p-0.5 rounded text-txt-muted hover:text-teal transition-colors"
              title="Spawn new isolated workspace"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>

          {/* Interactive AI Model Selector Dropdown with Status */}
          <div className="relative">
            <button
              onClick={() => setModelMenuOpen(!modelMenuOpen)}
              className="flex items-center gap-1.5 rounded-lg border border-teal/30 bg-teal/5 px-2 sm:px-2.5 py-1 font-mono text-[11px] text-teal hover:border-teal/50 hover:bg-teal/10 transition-colors"
              title="Change active LLM provider"
            >
              <Activity className="h-3 w-3 text-teal shrink-0" />
              <span className="font-semibold truncate max-w-[85px] sm:max-w-[110px]">
                {siteConfig.supportedModels.find((m) => m.id === selectedModel)?.name.split(" ")[0] || selectedModel}
              </span>
              <ChevronDown className="h-3 w-3 opacity-70" />
            </button>

            {modelMenuOpen && (
              <div
                className="absolute right-0 mt-2 w-56 rounded-xl border border-border-subtle bg-surface p-1.5 shadow-xl z-50 animate-in fade-in zoom-in-95"
                onMouseLeave={() => setModelMenuOpen(false)}
              >
                <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-txt-muted border-b border-border-subtle mb-1 flex items-center justify-between">
                  <span>AI Engine Provider</span>
                  <span className="text-success text-[9px]">● Online</span>
                </div>
                {siteConfig.supportedModels.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      setSelectedModel(m.id as AIModelCode);
                      setModelMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-2 rounded-lg text-left text-xs transition-colors ${
                      selectedModel === m.id
                        ? "bg-teal/10 text-teal font-semibold"
                        : "text-txt-primary hover:bg-elevated"
                    }`}
                  >
                    <div>
                      <div className="font-medium">{m.name}</div>
                      <div className="text-[10px] text-txt-muted font-mono">{m.provider}</div>
                    </div>
                    {selectedModel === m.id && <Check className="h-3.5 w-3.5 text-teal shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Theme Quick Toggle */}
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-lg border border-border-subtle bg-surface text-txt-muted hover:text-txt-primary transition-colors hidden sm:flex"
            title={`Current theme: ${theme}. Click to switch.`}
          >
            {theme === "light" && <Sun className="h-3.5 w-3.5" />}
            {theme === "dark" && <Moon className="h-3.5 w-3.5" />}
            {theme === "high-contrast" && <Contrast className="h-3.5 w-3.5 text-warning" />}
          </button>

          {/* Authenticated Role Badge & Role Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center focus:outline-none"
              title="Click to switch role or view profile"
            >
              <RoleBadge role={session?.role || "operator"} />
            </button>

            {userMenuOpen && (
              <div
                className="absolute right-0 mt-2 w-64 rounded-xl border border-border-subtle bg-surface p-3 shadow-2xl z-50 animate-in fade-in zoom-in-95"
                onMouseLeave={() => setUserMenuOpen(false)}
              >
                <div className="pb-2 border-b border-border-subtle space-y-1">
                  <div className="font-semibold text-xs text-txt-primary">
                    {session?.full_name || "Rajesh Sharma"}
                  </div>
                  <div className="text-[11px] font-mono text-txt-muted truncate">
                    {session?.email || "operator.rajesh@vikrant.internal"}
                  </div>
                  <div className="text-[10px] font-mono text-teal">
                    Facility: Bay C-4 • Heavy Forge
                  </div>
                </div>

                <div className="py-2 space-y-1.5">
                  <span className="block text-[10px] font-mono uppercase tracking-wider text-txt-muted font-semibold">
                    1-Click Switch Role
                  </span>
                  <div className="grid grid-cols-3 gap-1">
                    {quickRoles.map((qr) => (
                      <button
                        key={qr.role}
                        onClick={() => {
                          signIn(qr.email, qr.role, selectedLanguage, false);
                          setUserMenuOpen(false);
                        }}
                        className={`rounded border px-2 py-1 text-[10px] font-mono font-medium transition-colors ${
                          session?.role === qr.role
                            ? "bg-teal/15 border-teal text-teal font-bold"
                            : "border-border-subtle text-txt-muted hover:text-txt-primary hover:bg-elevated"
                        }`}
                      >
                        {qr.role.charAt(0).toUpperCase() + qr.role.slice(1, 4)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-border-subtle">
                  <Link
                    href="/settings"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center justify-between text-xs text-txt-muted hover:text-txt-primary p-1 rounded hover:bg-elevated"
                  >
                    <span>System Preferences & Keys</span>
                    <SettingsIcon className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
