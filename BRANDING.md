# BRANDING.md — Brand Identity & Verification

> **Project Identity**: Industrial Multimodal GenAI Assistant for SOPs, Manuals, and Expert Knowledge.

---

## 1. Naming & Verification Audit

**Audit Date**: October 20, 2026  
**Primary Working Title**: `FORGEWISE AI`  
**Internal Project Identifier**: `Vikrant 5.0 / ForgeWise`

### Conflict Investigation Findings
A search of public directories, company listings, and domain records revealed existing uses of the term "ForgeWise":
1. **ForgeWise (Product Studio & AI Frameworks)** — Studio producing consumer/SMB AI tools and guides.
2. **Forgewise AI (Brielle, Netherlands)** — Specialized AI workflow consultancy (domain: `forgewise.ai`).
3. **Forgewise LLC (US Defense / Cybersecurity)** — CMMC / NIST compliance consultancy for aerospace and defense contractors.
4. **Forgewise Community (India)** — Venture and founder network.

### Trademark & Clearance Disclaimer
*This audit constitutes a preliminary web and public namespace conflict analysis. It does NOT constitute legal trademark clearance, which must be performed by qualified intellectual property counsel prior to commercial registration in targeted jurisdictions.*

---

## 2. Brand Candidates & Evaluation

| Candidate | Visual & Market Suitability | Conflict Level | Decision |
|-----------|-----------------------------|----------------|----------|
| **ForgeWise AI** | Strong industrial resonance ("Forge" + "Wise") | High external namespace usage | Kept as default configurable dev label |
| **ForgePulse AI** (Alt 1) | Focuses on real-time operational heartbeat & telemetry | Low conflict | Viable secondary trademark |
| **VikrantSOP AI** (Alt 2) | Directly anchors repository origin ("Vikrant" = Courageous/Invincible), strong for bilingual (EN/HI) industrial markets | Minimal conflict in AI SaaS | Strong candidate for Asian/Global deployment |
| **FoundryMind AI** (Alt 3) | Heavy industry, foundry, and mechanical emphasis | Moderate | Viable enterprise alternative |

### Architectural Decision: Centralized Config
Brand presentation is decoupled from code through environment and configuration tokens:
- Frontend: `NEXT_PUBLIC_APP_NAME` in `apps/web/src/lib/config.ts` (default: `ForgeWise AI`)
- Backend: `APP_NAME` in `apps/api/app/core/config.py`
- Changing the brand requires updating one environment variable or config value without refactoring components.

---

## 3. Visual Identity System

### A. Logo & Wordmark
- **Wordmark**: `FORGEWISE` in clean geometric sans-serif (Inter / Outfit / Archivo), paired with a monospace superscript badge `[AI]`.
- **Glyph / Monogram**: Stylized CAD crosshair intersecting an isometric anvil/hex-block, evoking precision engineering, tolerance, and grounded accuracy.
- **Favicon**: High-contrast isometric hex-pin with center laser-crosshair (`apps/web/public/favicon.ico` and SVG).

### B. Typographic System
- **Headings & Display**: `Inter` / `Outfit` (500 Medium, 600 SemiBold, 700 Bold) — high legibility on high-DPI and industrial rugged tablets.
- **Body & Technical Text**: `Inter` (400 Regular, 500 Medium) with tight letter spacing for data tables and dense specifications.
- **Code, P&ID Tags & Serial Numbers**: `JetBrains Mono` or `ui-monospace` (e.g. `PMP-402-A`, `SOP-ELEC-042`, `14.2 bar`).

### C. Industrial Color Palette & Design Tokens
Inspired by aerospace engineering, precision machine tooling, and control room displays:
- **Navy Core (Primary)**: `hsl(222, 47%, 11%)` (`#0f172a`) — grounded authority.
- **Precision Slate (Surface)**: `hsl(215, 25%, 27%)` (`#334155`).
- **Safety Amber (Warning / Notice)**: `hsl(38, 92%, 50%)` (`#f59e0b`) — critical for machine isolation warnings.
- **Industrial Cyan / Electric Teal (Accent)**: `hsl(187, 85%, 43%)` (`#0ea5e9` / `#06b6d4`) — CAD crosshairs, active tools.
- **Emergency Crimson (Destructive / Hazard)**: `hsl(0, 84%, 60%)` (`#ef4444`) — Lockout/Tagout (LOTO) procedures.
- **Operational Green (Success / Verified Grounding)**: `hsl(142, 71%, 45%)` (`#10b981`) — Verified citation badge.

---

## 4. Tone of Voice & Safety-First Copy Guidelines
1. **Engineering Precision**: Direct, factual, unambiguous. Avoid hype, buzzwords ("revolutionary", "magic"), and hyperbole.
2. **Safety Primacy**: Whenever hazardous procedures (electrical, pneumatic, chemical, high-temperature) are retrieved, always prepend a prominent safety callout requiring authorized engineer sign-off and Lockout/Tagout compliance.
3. **No Em-Dashes**: In compliance with the design brief, em dashes (`—`) are strictly avoided in authored marketing and landing copy.
4. **Honest Limitations**: The platform explicitly marks citation confidence (`supported`, `insufficient_evidence`, `needs_review`) and never fabricates machine specifications.
