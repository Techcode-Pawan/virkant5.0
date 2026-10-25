"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, LogOut, Moon, Plus, Settings, Sun, Contrast } from "lucide-react";
import { cx, Spinner } from "@/components/ui/primitives";
import { errorMessage } from "@/lib/api-client";
import { useSession } from "@/lib/session";
import { useTheme } from "@/lib/theme";

const ROLE_LABEL: Record<string, string> = {
  viewer: "Viewer",
  operator: "Operator",
  engineer: "Engineer",
  knowledge_manager: "Knowledge manager",
  org_admin: "Org admin",
  platform_admin: "Platform admin",
};

function initials(name?: string) {
  return (name || "?")
    .split(/[\s.@]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export default function UserMenu() {
  const router = useRouter();
  const { session, workspaces, switchWorkspace, createNewWorkspace, signOut } = useSession();
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!session) return null;

  const run = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key);
    setError(null);
    try {
      await fn();
      setOpen(false);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const themes = [
    { id: "dark" as const, label: "Dark", icon: Moon },
    { id: "light" as const, label: "Light", icon: Sun },
    { id: "high-contrast" as const, label: "High contrast", icon: Contrast },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-border-strong bg-elevated text-xs font-semibold text-txt-primary hover:border-accent/50"
      >
        {initials(session.full_name)}
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-50 mt-1.5 w-[280px] rounded-lg border border-border-strong bg-surface shadow-panel">
          <div className="border-b border-border-subtle px-3.5 py-3">
            <p className="truncate text-sm font-medium text-txt-primary">{session.full_name}</p>
            <p className="truncate text-xs text-txt-muted">{session.email}</p>
            <p className="mt-1 text-xs text-txt-faint">{ROLE_LABEL[session.role] || session.role}</p>
          </div>

          <div className="border-b border-border-subtle py-1.5">
            <p className="px-3.5 pb-1 text-2xs font-medium text-txt-faint">Workspace</p>
            {(workspaces.length ? workspaces : [{ id: session.workspace_id, name: session.workspace_name, document_count: 0 }]).map((ws: any) => (
              <button
                key={ws.id}
                role="menuitemradio"
                aria-checked={ws.id === session.workspace_id}
                disabled={!!busy}
                onClick={() => ws.id !== session.workspace_id && run(ws.id, () => switchWorkspace(ws.id))}
                className="flex w-full items-center gap-2 px-3.5 py-1.5 text-left text-sm hover:bg-elevated disabled:opacity-60"
              >
                <span className="min-w-0 flex-1 truncate text-txt-primary">{ws.name}</span>
                <span className="text-2xs text-txt-faint">{ws.document_count} docs</span>
                {busy === ws.id ? <Spinner className="h-3.5 w-3.5" /> : ws.id === session.workspace_id && <Check className="h-3.5 w-3.5 text-accent" />}
              </button>
            ))}
            <button
              role="menuitem"
              disabled={!!busy}
              onClick={() => run("new", () => createNewWorkspace())}
              className="flex w-full items-center gap-2 px-3.5 py-1.5 text-left text-sm text-txt-muted hover:bg-elevated hover:text-txt-primary"
            >
              {busy === "new" ? <Spinner className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
              New workspace
            </button>
            {error && <p className="px-3.5 pt-1 text-xs text-danger">{error}</p>}
          </div>

          <div className="border-b border-border-subtle px-3.5 py-2.5">
            <p className="pb-1.5 text-2xs font-medium text-txt-faint">Theme</p>
            <div className="grid grid-cols-3 gap-1 rounded-md bg-base/60 p-0.5">
              {themes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  aria-pressed={theme === t.id}
                  className={cx(
                    "flex items-center justify-center gap-1 rounded px-1.5 py-1 text-xs",
                    theme === t.id ? "bg-elevated text-txt-primary" : "text-txt-muted hover:text-txt-primary",
                  )}
                >
                  <t.icon className="h-3 w-3" />
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="py-1.5">
            <Link href="/settings" role="menuitem" onClick={() => setOpen(false)} className="flex items-center gap-2 px-3.5 py-1.5 text-sm text-txt-muted hover:bg-elevated hover:text-txt-primary">
              <Settings className="h-3.5 w-3.5" /> Settings
            </Link>
            <button
              role="menuitem"
              onClick={() => {
                signOut();
                router.push("/login");
              }}
              className="flex w-full items-center gap-2 px-3.5 py-1.5 text-left text-sm text-txt-muted hover:bg-elevated hover:text-txt-primary"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
