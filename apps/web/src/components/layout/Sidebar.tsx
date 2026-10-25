"use client";

import React, { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import EmblemMark from "@/components/brand/EmblemMark";
import { cx } from "@/components/ui/primitives";
import { siteConfig } from "@/lib/config";
import { useSession } from "@/lib/session";
import { NAV_GROUPS, ROLE_LEVEL } from "./nav";

interface SidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  isDesktop: boolean;
  onCloseMobile: () => void;
}

export const SIDEBAR_ID = "app-sidebar";

export default function Sidebar({ collapsed, mobileOpen, isDesktop, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const { session } = useSession();
  const panelRef = useRef<HTMLElement>(null);
  const level = ROLE_LEVEL[session?.role || "viewer"] || 1;

  // Mobile overlay: close on Escape and move focus into the panel when it opens.
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCloseMobile();
    window.addEventListener("keydown", onKey);
    panelRef.current?.querySelector<HTMLElement>("a,button")?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen, onCloseMobile]);

  const showLabels = !isDesktop || !collapsed;

  return (
    <>
      {/* Mobile backdrop */}
      <div
        aria-hidden
        onClick={onCloseMobile}
        className={cx(
          "fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] transition-opacity duration-200 lg:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />
      <aside
        id={SIDEBAR_ID}
        ref={panelRef}
        aria-label="Main navigation"
        // Off-canvas on mobile: keep it out of the tab order and accessibility tree.
        inert={!isDesktop && !mobileOpen ? true : undefined}
        className={cx(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border-subtle bg-surface",
          "transition-[transform,width] duration-200 ease-out will-change-transform",
          // mobile: off-canvas drawer
          "w-[272px] -translate-x-full",
          mobileOpen && "translate-x-0",
          // desktop: always visible, collapsible to a rail
          "lg:translate-x-0",
          collapsed ? "lg:w-16" : "lg:w-[248px]",
        )}
      >
        <div className={cx("flex h-14 shrink-0 items-center border-b border-border-subtle", showLabels ? "px-4" : "justify-center px-0")}>
          <Link href="/dashboard" onClick={onCloseMobile} className="flex min-w-0 items-center gap-2.5" aria-label={`${siteConfig.brandName} dashboard`}>
            <EmblemMark size={26} />
            {showLabels && (
              <span className="truncate text-[0.9375rem] font-semibold tracking-[-0.01em] text-txt-primary">
                {siteConfig.brandName}
              </span>
            )}
          </Link>
          {mobileOpen && (
            <button onClick={onCloseMobile} className="icon-btn ml-auto lg:hidden" aria-label="Close navigation">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3 no-scrollbar">
          {NAV_GROUPS.map((group) => {
            const items = group.items.filter((i) => !i.minRole || level >= (ROLE_LEVEL[i.minRole] || 1));
            if (!items.length) return null;
            return (
              <div key={group.label} className="mb-4 last:mb-0">
                {showLabels ? (
                  <p className="px-2.5 pb-1.5 text-2xs font-medium text-txt-faint">{group.label}</p>
                ) : (
                  <div className="mx-3 mb-2 border-t border-border-subtle first:hidden" />
                )}
                <ul className="space-y-0.5">
                  {items.map((item) => {
                    const Icon = item.icon;
                    const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={onCloseMobile}
                          aria-current={active ? "page" : undefined}
                          title={showLabels ? undefined : item.label}
                          className={cx(
                            "group relative flex h-9 items-center gap-3 rounded-md text-sm transition-colors",
                            showLabels ? "px-2.5" : "justify-center",
                            active
                              ? "bg-elevated text-txt-primary font-medium"
                              : "text-txt-muted hover:bg-elevated/60 hover:text-txt-primary",
                          )}
                        >
                          {active && <span aria-hidden className="absolute left-0 top-2 bottom-2 w-[2px] rounded-full bg-accent" />}
                          <Icon className={cx("h-[18px] w-[18px] shrink-0", active ? "text-accent" : "")} />
                          {showLabels && <span className="truncate">{item.label}</span>}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>

        {showLabels && session && (
          <div className="border-t border-border-subtle px-4 py-3">
            <p className="truncate text-xs text-txt-muted" title={session.workspace_name}>
              {session.workspace_name}
            </p>
            <p className="truncate text-2xs text-txt-faint">{session.organization_name}</p>
          </div>
        )}
      </aside>
    </>
  );
}
