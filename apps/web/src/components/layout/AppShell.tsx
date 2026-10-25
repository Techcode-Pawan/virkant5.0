"use client";

import React, { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Menu } from "lucide-react";
import { cx, Spinner } from "@/components/ui/primitives";
import { LLMStatusProvider } from "@/lib/llm-status";
import { useSession } from "@/lib/session";
import ConnectionBanner from "./ConnectionBanner";
import ModelSelector from "./ModelSelector";
import Sidebar, { SIDEBAR_ID } from "./Sidebar";
import UserMenu from "./UserMenu";
import { pageTitle } from "./nav";

const COLLAPSE_KEY = "forgewise_sidebar_collapsed";
const DESKTOP_QUERY = "(min-width: 1024px)";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { status } = useSession();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {
      /* ignore */
    }
    const mq = window.matchMedia(DESKTOP_QUERY);
    const sync = () => {
      setIsDesktop(mq.matches);
      if (mq.matches) setMobileOpen(false);
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => setMobileOpen(false), [pathname]);

  // Lock page scroll behind the mobile drawer.
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (status === "anonymous") router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [status, pathname, router]);

  const toggle = useCallback(() => {
    if (isDesktop) {
      setCollapsed((c) => {
        try {
          localStorage.setItem(COLLAPSE_KEY, c ? "0" : "1");
        } catch {
          /* ignore */
        }
        return !c;
      });
    } else {
      setMobileOpen((o) => !o);
    }
  }, [isDesktop]);

  const closeMobile = useCallback(() => setMobileOpen(false), []);
  const expanded = isDesktop ? !collapsed : mobileOpen;

  if (status !== "authenticated") {
    return (
      <div className="flex min-h-screen items-center justify-center gap-2 text-sm text-txt-muted">
        <Spinner /> {status === "loading" ? "Loading your workspace" : "Redirecting to sign in"}
      </div>
    );
  }

  return (
    <LLMStatusProvider>
      <div className="min-h-screen">
        <Sidebar collapsed={collapsed} mobileOpen={mobileOpen} isDesktop={isDesktop} onCloseMobile={closeMobile} />
        <div className={cx("flex min-h-screen flex-col transition-[padding] duration-200 ease-out", collapsed ? "lg:pl-16" : "lg:pl-[248px]")}>
          <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border-subtle bg-base/85 px-3 backdrop-blur-md sm:px-4">
            <button
              onClick={toggle}
              className="icon-btn"
              aria-controls={SIDEBAR_ID}
              aria-expanded={expanded}
              aria-label={expanded ? "Collapse navigation" : "Open navigation"}
            >
              <Menu className="h-5 w-5" />
            </button>
            <p className="ml-1 truncate text-sm font-medium text-txt-primary">{pageTitle(pathname)}</p>
            <div className="ml-auto flex items-center gap-2">
              <ModelSelector compact={!isDesktop} />
              <UserMenu />
            </div>
          </header>
          <ConnectionBanner />
          <main className="mx-auto w-full max-w-[1240px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
        </div>
      </div>
    </LLMStatusProvider>
  );
}
