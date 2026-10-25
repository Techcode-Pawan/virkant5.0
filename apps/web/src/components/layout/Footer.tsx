import React from "react";
import Link from "next/link";
import { siteConfig } from "@/lib/config";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { href: "/features", label: "Capabilities" },
      { href: "/security", label: "Security" },
      { href: "/login", label: "Sign in" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/legal/privacy", label: "Privacy policy" },
      { href: "/legal/terms", label: "Terms of use" },
      { href: "/legal/data-declaration", label: "Data declaration" },
    ],
  },
  {
    title: "Company",
    links: [{ href: "/contact", label: "Contact" }],
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-border-subtle">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <p className="text-sm font-semibold">{siteConfig.brandName}</p>
          <p className="mt-2 max-w-xs text-sm text-txt-muted">
            Answers from your own SOPs and manuals, with the page they came from. Always follow site LOTO and PPE rules.
          </p>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <p className="text-sm font-medium text-txt-primary">{col.title}</p>
            <ul className="mt-2 space-y-1.5">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-txt-muted hover:text-txt-primary">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border-subtle">
        <p className="mx-auto max-w-6xl px-4 py-4 text-xs text-txt-faint sm:px-6">
          {siteConfig.brandName} {siteConfig.version}. {siteConfig.safetyEscalationContact}.
        </p>
      </div>
    </footer>
  );
}
