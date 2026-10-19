"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  MessageSquare,
  FileText,
  Cpu,
  BarChart3,
  Shield,
  Settings as SettingsIcon,
  LogOut,
  User,
  HardHat,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { siteConfig } from "@/lib/config";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { t, locale } = useTranslation();
  const [userRole, setUserRole] = useState("operator");
  const [userEmail, setUserEmail] = useState("operator.rajesh@vikrant.internal");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedRole = localStorage.getItem("forgewise_user_role") || "operator";
      const storedEmail = localStorage.getItem("forgewise_user_email") || "operator.rajesh@vikrant.internal";
      setUserRole(storedRole);
      setUserEmail(storedEmail);
    }
  }, []);

  const navItems = [
    { href: "/dashboard", label: t("nav.dashboard"), icon: LayoutDashboard },
    { href: "/chat", label: t("nav.chat"), icon: MessageSquare },
    { href: "/documents", label: t("nav.documents"), icon: FileText },
    { href: "/machines", label: t("nav.machines"), icon: Cpu },
    { href: "/analytics", label: t("nav.analytics"), icon: BarChart3 },
    { href: "/admin", label: t("nav.admin"), icon: Shield, minRole: "org_admin" },
    { href: "/settings", label: t("nav.settings"), icon: SettingsIcon },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-base">
      {/* Facility Header Banner */}
      <div className="border-b border-border-subtle bg-surface px-4 py-2.5 sm:px-8 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2">
          <span className="font-semibold text-txt-primary">Vikrant Heavy Forge Industries</span>
          <span className="text-border-subtle">|</span>
          <span className="font-mono text-txt-muted">Facility Bay C-4</span>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center gap-1.5 rounded-full bg-elevated px-2.5 py-0.5 border border-border-subtle font-mono text-[11px]">
            <HardHat className="h-3 w-3 text-teal" />
            <span className="uppercase text-txt-primary font-semibold">{userRole}</span>
          </div>
          <span className="text-txt-muted font-mono hidden sm:inline">{userEmail}</span>
        </div>
      </div>

      {/* Sub-navigation Tabs */}
      <div className="border-b border-border-subtle bg-surface px-4 sm:px-8">
        <nav className="flex space-x-2 overflow-x-auto py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                  isActive
                    ? "bg-brand text-white shadow-xs"
                    : "text-txt-muted hover:text-txt-primary hover:bg-elevated"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Main Page Canvas */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
