# UI Design Guide

This document defines the visual system for pages and components in this app. Follow these rules to keep new UI consistent.

## 1) Visual language
- Calm, minimal, paper-like surface.
- Soft glass panels on a warm off-white background.
- Subtle texture via radial gradient + dotted grid.
- High-contrast black text and thin, precise borders.

## 2) Color palette (use exact values)
**Base**
- Canvas: `#f8f6f1`
- Alt canvas: `#f1efe8`
- Text: `#0c0c0c`

**Neutrals**
- Border: `rgba(0,0,0,0.10)`
- Muted text: `rgba(0,0,0,0.50)`
- Subtle text: `rgba(0,0,0,0.60)`
- Hover border: `rgba(0,0,0,0.40)`

**Accent**
- Solid black for default primary actions
- Day planning accent: orange (Tailwind `orange-500/400/300/200/100`)
- Morning routine accent: sky blue (Tailwind `sky-500/400/300/200/100`)
- White overlays for glass panels: `rgba(255,255,255,0.70-0.90)`

## 3) Background treatment
Every full page should use the same layered background:
- Base: `bg-[#f8f6f1] text-[#0c0c0c]`
- Radial wash (top-weighted):
  - `bg-[radial-gradient(ellipse_at_top,_#ffffff_0%,_#f8f6f1_55%,_#f1efe8_100%)]`
- Dot grid overlay:
  - `bg-[radial-gradient(#1a1a1a1a_1px,transparent_1px)] [background-size:20px_20px]`
  - `opacity-80`

## 4) Typography
- Default system sans. No custom fonts are currently used.
- Headings: `font-semibold`, `tracking-tight`.
- Labels and meta: uppercase with wide tracking.
  - Common: `text-xs uppercase tracking-[0.3em]`.
- Body: small, calm sizes (`text-sm`, `text-xs`).

## 5) Layout and spacing
- Centered content with a standardized max width:
  - Primary pages: `max-w-5xl`.
- Standard padding: `px-6 pt-10 pb-32/36`.
- Vertical rhythm uses 2–6 step gaps (`mt-2`, `mt-4`, `mt-6`, `mt-14`).

## 6) Surfaces (glass cards)
Use a "glass" card for primary content:
- `rounded-3xl border border-black/10 bg-white/70 backdrop-blur`
- Shadow: `shadow-[0_18px_50px_rgba(0,0,0,0.08)]`
- Inner fields: `rounded-2xl border border-black/10 bg-white/80 shadow-inner`

## 7) Buttons and pills
**Icon-first controls (preferred)**
- Default to icon-only buttons for primary actions when space is limited.
- Use clear, simple glyphs (play, pause, reset, add, delete, move) with consistent sizing.
- Always pair icon-only buttons with `aria-label` + `title`.
- Suggested sizing: `h-8 w-8` or `h-9 w-9`, centered icon, `text-sm` for glyphs.

**Primary pill button**
- `rounded-full border border-black/20 px-4 py-2 text-xs uppercase tracking-[0.3em]`
- Hover: `hover:border-black/60 hover:bg-black hover:text-white`
- Focus: `focus:outline-none focus-visible:ring-2 focus-visible:ring-black/40`
- Accent variants are allowed only for section-specific CTAs:
  - Planning: orange border/background + subtle orange hover
  - Morning: sky border/background + subtle sky hover

**Secondary pill button**
- `rounded-full border border-black/10 px-2 py-1 text-[10px] uppercase tracking-[0.2em]`
- Hover: `hover:border-black/60 hover:bg-black hover:text-white`

**Bottom nav pill**
- Container: `rounded-full bg-white/90 border border-black/10 backdrop-blur shadow-[0_12px_40px_rgba(0,0,0,0.08)]`
- Item (active): `bg-black text-white`
- Item (inactive): `text-black/70 hover:bg-black/5`

## 8) Cards and list rows
- Rows: `rounded-xl border border-black/5 bg-white/60 px-3 py-2`
- Meta text: `text-[10px] uppercase tracking-[0.2em] text-black/50`

## 9) Icons and indicators
- USE @heroicons/react
- Use simple geometric dots/lines and minimal line icons.
- Prefer icons over text for repeated actions or utility controls.
- Keep icon stroke/weight consistent; avoid complex or filled multi-tone icons.
- States:
  - Filled day: `bg-black` (or section accent for planning/morning)
  - Past day: `bg-black/30` or thin line (or a lighter accent tone)
  - Future day: `border border-black/20` with transparent fill (or accent border)

## 10) Motion
- Keep to small transitions only:
  - `transition` on hover states.
- Avoid large animated effects or heavy motion.

## 11) Accessibility
- Use `focus-visible` rings for all interactive elements.
- Maintain contrast: black text on off-white canvas; white text on black buttons.
- Provide `aria-label` for icon-only controls.

## 12) Do / Don’t
**Do**
- Keep UI quiet, minimal, and high-contrast.
- Use uppercase tracking for labels and nav.
- Reuse the glass card and pill patterns.
- Use orange accents for Day planning and sky accents for Morning routine.

**Don’t**
- Introduce extra saturated colors beyond the two section accents.
- Add heavy shadows or neon effects.
- Use default blue links or underlines.
