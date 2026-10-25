import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/hooks/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        base: "rgb(var(--bg-base) / <alpha-value>)",
        surface: "rgb(var(--bg-surface) / <alpha-value>)",
        elevated: "rgb(var(--bg-elevated) / <alpha-value>)",
        "txt-primary": "rgb(var(--text-primary) / <alpha-value>)",
        "txt-muted": "rgb(var(--text-muted) / <alpha-value>)",
        "txt-faint": "rgb(var(--text-faint) / <alpha-value>)",
        "border-subtle": "rgb(var(--border-subtle) / <alpha-value>)",
        "border-strong": "rgb(var(--border-strong) / <alpha-value>)",
        "border-focus": "rgb(var(--border-focus) / <alpha-value>)",
        // `brand` = filled-button blue (passes contrast with white text)
        brand: "rgb(var(--accent-strong) / <alpha-value>)",
        accent: "rgb(var(--accent) / <alpha-value>)",
        // legacy alias used across older pages; maps to the accent
        teal: "rgb(var(--accent) / <alpha-value>)",
        straw: "rgb(var(--straw) / <alpha-value>)",
        success: "rgb(var(--status-success) / <alpha-value>)",
        warning: "rgb(var(--status-warning) / <alpha-value>)",
        danger: "rgb(var(--status-danger) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "IBM Plex Sans", "Segoe UI", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "IBM Plex Mono", "ui-monospace", "Consolas", "monospace"],
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem" }],
      },
      borderRadius: {
        DEFAULT: "6px",
        md: "8px",
        lg: "10px",
        xl: "12px",
        "2xl": "16px",
      },
      boxShadow: {
        xs: "0 1px 0 0 rgb(0 0 0 / 0.25)",
        panel: "0 1px 0 0 rgb(255 255 255 / 0.03) inset, 0 12px 32px -18px rgb(0 0 0 / 0.6)",
      },
      transitionTimingFunction: {
        out: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
