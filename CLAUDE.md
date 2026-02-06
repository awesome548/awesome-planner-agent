# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server (http://localhost:3000)
npm run build        # Production build
npm run lint         # ESLint (eslint-config-next with core-web-vitals + typescript)
```

No test framework is configured.

## Environment

Create `.env.local` with:
- `OPENAI_API_KEY` - required for plan generation
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` - required for Google OAuth / Calendar
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` - required for usage tracking
- `NOTION_API_KEY`, `NOTION_PAGE_ID` - optional, for fetching planner rules

All env vars are validated with Zod in `src/lib/env.ts` (loaded from `.env.local` with override).

## Architecture

**Next.js 16 App Router** with three pages:

| Route | Purpose |
|-------|---------|
| `/` | Day planner: text input -> OpenAI generates structured schedule -> preview/edit -> create Google Calendar events |
| `/morning` | Morning routine: CRUD actions, fullscreen timer runner mode with long-press "Move to next" (2s hold), per-action completion tracking |
| `/usage` | Year-at-a-glance: 365-dot grid showing streaks for both planning and routine completion |

**API routes** (`src/app/api/`):
- `plan/route.ts` - POST: validates input, fetches today's Google Calendar events, optionally fetches Notion rules, sends prompt to OpenAI (`gpt-5-mini` with `zodTextFormat`), returns validated `Plan` with conflict detection
- `calendar/create/route.ts` - POST: re-checks conflicts, creates Google Calendar events sequentially
- `auth/[...nextauth]/route.ts` - NextAuth dynamic handler

**Key data flow for plan generation:**
1. Client sends `{ text, timeZone }` to `/api/plan`
2. API fetches existing calendar events and Notion rules
3. OpenAI generates structured JSON matching `PlanSchema` (Zod validated)
4. Conflict detection runs against busy intervals
5. Client previews/edits, then sends to `/api/calendar/create`
6. Usage marked in Supabase

## State Management

Two Zustand stores in `src/lib/`:
- `usage-store.ts` - tracks which dates the day planner was used (`usage_records` table)
- `morning-routine-store.ts` - manages routine actions and per-day completion (`morning_routine_actions`, `morning_routine_completions`, `morning_routine_action_records` tables)

Both stores use immutable update patterns exclusively. Each store has an `initialized` boolean flag for idempotent initialization (set synchronously before the async fetch to prevent concurrent calls; reset on failure for retry).

Store initialization is centralized in `src/components/storeInitializer.tsx`, rendered inside `<SessionProvider>` in `src/app/providers.tsx`. This ensures stores load from any entry page (`/`, `/morning`, `/usage`) without duplicating init logic in individual pages.

## Database (Supabase)

Migrations live in `supabase/migrations/`. Tables:
- `usage_records` (PK: `used_on` date)
- `morning_routine_actions` (uuid PK, title, position)
- `morning_routine_completions` (PK: `completed_on` date, boolean `completed`)
- `morning_routine_action_records` (uuid PK, FK to actions, unique `(action_id, completed_on)`)

RLS is enabled on all tables with public read/write policies (single-user app).

## Auth

NextAuth v4 with Google provider, JWT session strategy. OAuth scope includes `https://www.googleapis.com/auth/calendar`. Token refresh logic in `src/auth.ts` (1-hour expiry with 60s buffer). Access token stored in session for Google Calendar API calls.

## Design System

Documented in `DESIGN.md`. Key rules:
- Glass morphism: `rounded-3xl border border-black/10 bg-white/70 backdrop-blur shadow-[0_18px_50px_rgba(0,0,0,0.08)]`
- Canvas: `#f8f6f1`, text: `#0c0c0c`
- Orange accent for day planning, sky/pink accent for morning routine
- Pill buttons: `rounded-full border border-black/20 px-4 py-2 text-xs uppercase tracking-[0.3em]`
- Icon-only buttons preferred for actions, always with `aria-label` + `title`
- Icons from `@heroicons/react` only
- Bottom navigation: fixed pill-style nav bar (`src/components/bottomBar.tsx`)

## Code Conventions

- Path alias: `@/*` maps to `./src/*`
- API responses use `{ ok: boolean, error?: string, ... }` envelope
- Schemas defined with Zod in `src/lib/schemas.ts`, types inferred via `z.infer`
- Tailwind CSS v4 (configured via `@tailwindcss/postcss`)
- Custom grid utility: `grid-cols-30` in `tailwind.config.ts`
