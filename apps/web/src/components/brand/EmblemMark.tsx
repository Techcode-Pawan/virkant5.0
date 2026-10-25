import React, { useId } from "react";

interface EmblemMarkProps {
  size?: number;
  className?: string;
  title?: string;
}

/**
 * Flat version of the 3D emblem: an icosahedron seen along its 3-fold axis
 * (the "neural core"), stroked in temper blue → straw.
 */
export default function EmblemMark({ size = 28, className = "", title }: EmblemMarkProps) {
  const id = useId().replace(/:/g, "");
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
    >
      {title && <title>{title}</title>}
      <defs>
        <linearGradient id={`g-${id}`} x1="8" y1="6" x2="40" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#9DBDF2" />
          <stop offset="0.55" stopColor="#5B86D6" />
          <stop offset="1" stopColor="#D4A64A" />
        </linearGradient>
        <radialGradient id={`c-${id}`} cx="24" cy="24" r="10" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#9DBDF2" stopOpacity="0.55" />
          <stop offset="1" stopColor="#9DBDF2" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="24" cy="24" r="10" fill={`url(#c-${id})`} />
      <g stroke={`url(#g-${id})`} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round">
        <path d="M24 4 41.32 14v20L24 44 6.68 34V14Z" />
        <path d="M24 14 32.66 29H15.34Z" />
        <path d="M24 14 24 4M24 14 41.32 14M24 14 6.68 14" />
        <path d="M32.66 29 41.32 14M32.66 29 41.32 34M32.66 29 24 44" />
        <path d="M15.34 29 24 44M15.34 29 6.68 34M15.34 29 6.68 14" />
      </g>
      <g fill="#E6E9EE">
        <circle cx="24" cy="14" r="1.7" />
        <circle cx="32.66" cy="29" r="1.7" />
        <circle cx="15.34" cy="29" r="1.7" />
      </g>
    </svg>
  );
}
