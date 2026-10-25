import React from "react";

interface FWLogoProps {
  className?: string;
  size?: number;
  glow?: boolean;
}

export default function FWLogo({ className = "", size = 36, glow = true }: FWLogoProps) {
  return (
    <div
      className={`relative flex items-center justify-center shrink-0 ${className}`}
      style={{ width: size, height: size }}
      title="ForgeWise AI — Precision Industrial Copilot"
    >
      {glow && (
        <div
          className="absolute inset-0 rounded-lg bg-teal/20 blur-sm pointer-events-none"
          aria-hidden="true"
        />
      )}
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10 transition-transform duration-200 group-hover:scale-105"
      >
        {/* Outer Industrial Chamfered Box */}
        <rect
          x="3"
          y="3"
          width="42"
          height="42"
          rx="10"
          className="fill-slate-900 stroke-border-subtle"
          strokeWidth="1.5"
        />
        {/* Subtle Inner Frame Gradient */}
        <rect
          x="4.5"
          y="4.5"
          width="39"
          height="39"
          rx="8.5"
          className="stroke-teal/30"
          strokeWidth="1"
          strokeDasharray="3 3"
        />

        {/* Forge Anvil / Precision Caliper Base */}
        <path
          d="M12 36L36 36"
          stroke="currentColor"
          className="text-slate-600 dark:text-slate-500"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* Stylized 'F' Glyph (Cyan / Teal) */}
        <path
          d="M15 13H27M15 13V35M15 22H24"
          stroke="#06B6D4"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Stylized 'W' Glyph (Precision Industrial Orange/Amber & Crisp Steel) */}
        <path
          d="M24 19L27.5 32L31 23L34.5 32L38 19"
          stroke="#F59E0B"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Precision Laser Spark Dot */}
        <circle cx="24" cy="13" r="1.8" className="fill-teal animate-pulse" />
      </svg>
    </div>
  );
}
