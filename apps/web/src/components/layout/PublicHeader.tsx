"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import EmblemMark from "@/components/brand/EmblemMark";
import { cx } from "@/components/ui/primitives";
import { siteConfig } from "@/lib/config";
import { useSession } from "@/lib/session";

const LINKS = [
  { href: "/features", label: "Capabilities" },
  { href: "/security", label: "Security" },
  { href: "/contact", label: "Contact" },
];

export default function PublicHeader() {
  const pathname = usePathname();
  const { status } = useSession();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-border-subtle bg-base/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <EmblemMark size={26} />
          <span className="text-[0.9375rem] font-semibold tracking-[-0.01em]">{siteConfig.brandName}</span>
        </Link>
        <nav className="hidden items-center gap-5 md:flex" aria-label="Site">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cx("text-sm transition-colors", pathname === l.href ? "text-txt-primary" : "text-txt-muted hover:text-txt-primary")}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto hidden items-center gap-2 md:flex">
          {status === "authenticated" ? (
            <Link href="/dashboard" className="btn-primary">Open workspace</Link>
          ) : (
            <>
              <Link href="/login" className="btn-ghost">Sign in</Link>
              <Link href="/register" className="btn-primary">Create account</Link>
            </>
          )}
        </div>
        <button className="icon-btn ml-auto md:hidden" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label="Menu">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open && (
        <nav className="border-t border-border-subtle px-4 py-3 md:hidden" aria-label="Site">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="block rounded-md px-2 py-2 text-sm text-txt-muted hover:bg-elevated hover:text-txt-primary">
              {l.label}
            </Link>
          ))}
          <div className="mt-2 flex gap-2 border-t border-border-subtle pt-3">
            {status === "authenticated" ? (
              <Link href="/dashboard" className="btn-primary flex-1">Open workspace</Link>
            ) : (
              <>
                <Link href="/login" className="btn-secondary flex-1">Sign in</Link>
                <Link href="/register" className="btn-primary flex-1">Create account</Link>
              </>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
