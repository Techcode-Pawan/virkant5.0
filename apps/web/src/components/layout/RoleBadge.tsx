import React from "react";
import { UserRole } from "@/types";

interface RoleBadgeProps {
  role?: string;
  className?: string;
  size?: "sm" | "md";
  showDot?: boolean;
}

export default function RoleBadge({
  role = "operator",
  className = "",
  size = "md",
  showDot = true,
}: RoleBadgeProps) {
  const normalized = (role || "operator").toLowerCase() as UserRole | "org_admin" | "platform_admin";

  // Role color tokens
  const config = {
    operator: {
      label: "OPERATOR",
      bg: "bg-amber-500/10 dark:bg-amber-500/15",
      border: "border-amber-500/30",
      text: "text-amber-700 dark:text-amber-400",
      dot: "bg-amber-500",
      iconSvg: (
        // Precision Hardhat / Safety Helmet SVG
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-3.5 w-3.5 shrink-0"
        >
          <path d="M2 18a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v2z" />
          <path d="M10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5" />
          <path d="M4 15v-3a8 8 0 0 1 16 0v3" />
        </svg>
      ),
    },
    engineer: {
      label: "ENGINEER",
      bg: "bg-teal/10 dark:bg-teal/15",
      border: "border-teal/30",
      text: "text-teal dark:text-teal-400",
      dot: "bg-teal",
      iconSvg: (
        // Precision Circuit / CAD Compass SVG
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-3.5 w-3.5 shrink-0"
        >
          <path d="m21.5 21.5-1.4-1.4" />
          <path d="m2 2 1.4 1.4" />
          <path d="M18.8 9.5a6 6 0 1 0-7.3 7.3" />
          <path d="M5.2 14.5a6 6 0 1 0 7.3-7.3" />
        </svg>
      ),
    },
    org_admin: {
      label: "ADMIN",
      bg: "bg-indigo-500/10 dark:bg-indigo-500/15",
      border: "border-indigo-500/30",
      text: "text-indigo-700 dark:text-indigo-400",
      dot: "bg-indigo-500",
      iconSvg: (
        // Precision Shield / Key SVG
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-3.5 w-3.5 shrink-0"
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      ),
    },
    platform_admin: {
      label: "PLATFORM ADMIN",
      bg: "bg-purple-500/10 dark:bg-purple-500/15",
      border: "border-purple-500/30",
      text: "text-purple-700 dark:text-purple-400",
      dot: "bg-purple-500",
      iconSvg: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-3.5 w-3.5 shrink-0"
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
        </svg>
      ),
    },
    viewer: {
      label: "VIEWER",
      bg: "bg-slate-500/10",
      border: "border-slate-500/30",
      text: "text-slate-600 dark:text-slate-400",
      dot: "bg-slate-400",
      iconSvg: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-3.5 w-3.5 shrink-0"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
        </svg>
      ),
    },
  };

  const style = config[normalized as keyof typeof config] || config.operator;

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono font-semibold tracking-wider transition-colors select-none ${
        size === "sm" ? "text-[10px] py-0 px-2" : "text-[11px]"
      } ${style.bg} ${style.border} ${style.text} ${className}`}
      title={`Authenticated Role: ${style.label}`}
    >
      {style.iconSvg}
      <span>{style.label}</span>
      {showDot && (
        <span className="relative flex h-1.5 w-1.5">
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${style.dot}`}
          />
          <span
            className={`relative inline-flex rounded-full h-1.5 w-1.5 ${style.dot}`}
          />
        </span>
      )}
    </div>
  );
}
