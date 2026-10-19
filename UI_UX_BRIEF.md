# UI_UX_BRIEF.md — Industrial Interface & Experience Design System

> **Product**: ForgeWise AI (Vikrant 5.0 Platform)  
> **Philosophy**: Precision Engineering, High Trust, Zero Gimmicks  
> **Standard**: WCAG 2.2 AA Compliance  
> **Date**: October 20, 2026  

---

## 1. Aesthetic Direction & Industrial Design Language

ForgeWise AI is designed for factory floors, engineering offices, and plant control rooms. It evokes the feeling of advanced computer-aided design (CAD) software, SCADA systems, and high-reliability aerospace instrumentation.

### 1.1 Guiding Principles
1. **Utility Over Decoration**: Every pixel, border, and badge must serve an operational purpose.
2. **High-Density Legibility**: Clear contrast, tabular numbers for measurements, and compact, structured layouts that maximize screen real estate on tablets and desktop monitors.
3. **Safety & Grounding Primacy**: Hazardous procedures are highlighted with distinct safety amber and emergency crimson banners; verified citations are clearly distinguished with operational green badges.
4. **No Fluff or Fake Elements**: Absolutely no bubble gradients, no purple-pink AI glow, no cursor-following particles, no floating unclickable cards, no fake customer testimonials, and no fake statistics.
5. **No Em-Dashes in Authored Copy**: In strict adherence to the project brief, em dashes are prohibited across marketing and application UI copy.

---

## 2. Color System & Design Tokens

The application uses CSS Custom Properties (`hsl` values) mapped through Tailwind CSS to allow instantaneous, jitter-free theme switching across the entire DOM tree.

### 2.1 Color Tokens Specification

| Token Name | Light Theme (Default) | Dark Theme | High-Contrast Mode | Purpose |
|------------|----------------------|------------|--------------------|---------|
| `--bg-base` | `hsl(210, 20%, 98%)` (`#f8fafc`) | `hsl(222, 47%, 7%)` (`#0b0f19`) | `hsl(0, 0%, 0%)` (`#000000`) | Main page canvas |
| `--bg-surface` | `hsl(0, 0%, 100%)` (`#ffffff`) | `hsl(222, 40%, 11%)` (`#111827`) | `hsl(0, 0%, 5%)` (`#0d0d0d`) | Cards, panels, drawers |
| `--bg-elevated` | `hsl(210, 20%, 96%)` (`#f1f5f9`) | `hsl(217, 33%, 17%)` (`#1e293b`) | `hsl(0, 0%, 12%)` (`#1f1f1f`) | Hover states, modals |
| `--text-primary` | `hsl(222, 47%, 11%)` (`#0f172a`) | `hsl(210, 40%, 98%)` (`#f8fafc`) | `hsl(0, 0%, 100%)` (`#ffffff`) | Headings and primary text |
| `--text-muted` | `hsl(215, 16%, 47%)` (`#64748b`) | `hsl(215, 20%, 65%)` (`#94a3b8`) | `hsl(0, 0%, 85%)` (`#d9d9d9`) | Captions, metadata, helper text |
| `--border-subtle` | `hsl(214, 32%, 91%)` (`#e2e8f0`) | `hsl(217, 33%, 20%)` (`#1e293b`) | `hsl(0, 0%, 50%)` (`#808080`) | Dividers and containers |
| `--border-focus` | `hsl(199, 89%, 48%)` (`#0284c7`) | `hsl(199, 89%, 48%)` (`#38bdf8`) | `hsl(60, 100%, 50%)` (`#ffff00`) | Keyboard focus ring |
| `--brand-primary` | `hsl(215, 28%, 17%)` (`#1e293b`) | `hsl(210, 40%, 96%)` (`#f1f5f9`) | `hsl(0, 0%, 100%)` (`#ffffff`) | Primary buttons & brand |
| `--accent-teal` | `hsl(187, 85%, 38%)` (`#0891b2`) | `hsl(187, 85%, 48%)` (`#06b6d4`) | `hsl(180, 100%, 50%)` (`#00ffff`) | Active tabs, CAD highlights |
| `--status-success` | `hsl(142, 71%, 38%)` (`#15803d`) | `hsl(142, 71%, 45%)` (`#22c55e`) | `hsl(120, 100%, 50%)` (`#00ff00`) | Verified citation status |
| `--status-warning` | `hsl(38, 92%, 44%)` (`#b45309`) | `hsl(38, 92%, 50%)` (`#f59e0b`) | `hsl(60, 100%, 50%)` (`#ffff00`) | Safety hazard alerts, LOTO |
| `--status-danger` | `hsl(0, 84%, 48%)` (`#dc2626`) | `hsl(0, 84%, 60%)` (`#ef4444`) | `hsl(0, 100%, 50%)` (`#ff0000`) | Critical machine stoppage |

---

## 3. Typography & Hierarchy

- **Font Family**: Modern sans-serif stack (`Inter`, `system-ui`, `-apple-system`, `sans-serif`)
- **Monospace Family**: `ui-monospace`, `JetBrains Mono`, `SFMono-Regular`, `Consolas`
- **Heading Scales**:
  - `H1 / Hero Title`: `text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight` (Restrained, not oversized)
  - `H2 / Section Title`: `text-2xl sm:text-3xl font-semibold tracking-tight`
  - `H3 / Card Header`: `text-lg sm:text-xl font-medium`
  - `Body Regular`: `text-sm sm:text-base leading-relaxed`
  - `Technical Spec / Tag`: `text-xs font-mono tracking-wider uppercase`

---

## 4. 3D Industrial Assembly & CAD Interactive Experience

### 4.1 Concept
An interactive, CAD-rendered planetary gear assembly / hydraulic manifold rendered in clean Three.js.
- **Visual Style**: Clean wireframe-overlay on precision metallic/matte finish. Orthographic/perspective CAD camera with gentle orbital damping.
- **Interactive Points**: Users can rotate the assembly, click component hotspots (e.g. `Bearing Cage`, `Pressure Port`, `Input Shaft`), which displays a real-time SOP document citation callout linked to the RAG pipeline.
- **Performance Guardrails**:
  - Framerate throttled to 60 FPS with automatic pixel-ratio clamping (`Math.min(window.devicePixelRatio, 2)`).
  - Pauses rendering automatically when scrolled out of viewport via `IntersectionObserver`.
  - Static SVG/CSS CAD blueprint fallback provided when WebGL is unavailable or when `prefers-reduced-motion` is active.

---

## 5. Controlled Motion Primitives & Transitions

All animations are governed by centralized motion tokens located in `apps/web/src/lib/motion/tokens.ts`:

- **Durations**:
  - `fast`: `150ms` (hover, active button press, tooltip appearance)
  - `standard`: `240ms` (dialog transitions, drawer slide, tab switches)
  - `slow`: `380ms` (page transitions, complex panel reveals)
- **Easings**:
  - `easeOutCubic`: `[0.33, 1, 0.68, 1]` for entrances
  - `easeInOutCubic`: `[0.65, 0, 0.35, 1]` for continuous movements
- **Primitives**:
  - `FadeIn`: Subtle opacity transition with 4px translation
  - `SlideIn`: Horizontal or vertical entry with bounded spring damping
  - `StaggerChildren`: Progressive 40ms delay for lists and grid items
  - `RevealOnScroll`: Intersection-triggered single reveal

---

## 6. Accessibility & Form Factor Adaptability

- **Touch Targets**: Minimum 44x44 CSS pixels for all buttons and interactive controls (rugged glove friendly).
- **Voice Feedback**: Visible pulse animation and decibel/waveform indicator during speech recording; accessible screen-reader live region (`aria-live="polite"`).
- **Citations Drawer**: Full slide-over panel with keyboard escape (`Esc`) dismissal, focus trapping, and deep-linkable page preview.
