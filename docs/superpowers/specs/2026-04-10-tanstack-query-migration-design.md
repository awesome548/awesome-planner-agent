# TanStack Query Migration + Store Refactor + Route Restructure

## Goal

Centralize all API/data-fetching into TanStack Query, remove Zustand stores that cache server state, and restructure routes so `/` is a dashboard and `/plan` holds the day planner.

## Principles

- **Zustand** = client-only state (auth session, UI toggles)
- **TanStack Query** = anything from/to Supabase or API routes (caching, dedup, retry, stale-while-revalidate)
- Optimistic updates for all mutations that had them before (`markUsed`, `toggleUsed`, `toggleActionCompletion`, etc.)

---

## Route Changes

| Before | After | Content |
|--------|-------|---------|
| `/` | `/plan` | Day planner (text → OpenAI → calendar sync) |
| `/morning` | `/morning` | Morning routine (unchanged route) |
| `/usage` | `/usage` | Usage stats (unchanged route) |
| — | `/` | **NEW** Dashboard: links to /plan, /morning, /usage + status summary (today's plan, routine completion, streak) |

## New Files

### `src/lib/query-client.ts`
QueryClient singleton with config:
- `staleTime: 5 * 60 * 1000` (5 min)
- `gcTime: 30 * 60 * 1000` (30 min)
- `retry: 1`
- `refetchOnWindowFocus: true`

### `src/lib/api/client.ts`
Typed fetch wrapper that handles the `{ ok, error }` envelope pattern. Throws on `!ok` with the error message. Used by all queries and mutations calling Next.js API routes.

### `src/lib/api/keys.ts`
Query key factory:
```ts
export const queryKeys = {
  calendars: ['calendars'] as const,
  usage: {
    all: ['usage'] as const,
    records: () => ['usage', 'records'] as const,
  },
  routine: {
    all: ['routine'] as const,
    actions: () => ['routine', 'actions'] as const,
    records: (date: string) => ['routine', 'records', date] as const,
    completions: () => ['routine', 'completions'] as const,
  },
} as const
```

### `src/lib/api/queries.ts`
Query hooks (all read from Supabase or API routes):
- `useCalendars(enabled)` — GET `/api/calendar/calendars`
- `useUsageRecords()` — Supabase `usage_records` → `Record<string, boolean>`
- `useRoutineActions()` — Supabase `morning_routine_actions` ordered by position
- `useActionRecords(date)` — Supabase `morning_routine_action_records` for date
- `useRoutineCompletions()` — Supabase `morning_routine_completions` → `Record<string, boolean>`

### `src/lib/api/mutations.ts`
Mutation hooks:
- `usePreparePlan()` — POST `/api/plan/prepare`
- `useGeneratePlan()` — POST `/api/plan`
- `useCreateEvents()` — POST `/api/calendar/create`
- `useMarkUsed()` — optimistic upsert to `usage_records`
- `useToggleUsed()` — optimistic toggle on `usage_records`
- `useAddAction()` — insert into `morning_routine_actions`
- `useUpdateAction()` — update `morning_routine_actions`
- `useDeleteAction()` — delete + reorder `morning_routine_actions`
- `useReorderActions()` — optimistic reorder `morning_routine_actions`
- `useToggleActionCompletion()` — optimistic toggle `morning_routine_action_records`
- `useMarkDayComplete()` — upsert `morning_routine_completions`

### `src/lib/api/optimistic.ts`
Shared helpers for optimistic cache updates (setQueryData + rollback on error).

### `src/app/page.tsx` (NEW)
Dashboard page showing:
- Quick status: today's plan (from usage query), routine completion, current streak
- Navigation cards linking to `/plan`, `/morning`, `/usage`

### `src/app/plan/page.tsx`
Moved from current `src/app/page.tsx`. Refactored:
- `useCalendars()` query replaces manual fetch + `calendars`/`calendarsLoading` state
- `usePreparePlan()` + `useGeneratePlan()` mutations replace manual fetch chain + `loading` state
- `useCreateEvents()` mutation replaces manual fetch + `creating` state
- `useMarkUsed()` mutation replaces store call
- Remaining local state: `text`, `draftTasks`, `selectedCalendarId`

## Deleted Files

- `src/lib/usage-store.ts` — replaced by `useUsageRecords()` query + `useMarkUsed()`/`useToggleUsed()` mutations
- `src/lib/morning-routine-store.ts` — replaced by routine queries/mutations + local `useState` for `runnerOpen`/`managerOpen`

## Modified Files

### `src/app/providers.tsx`
Add `QueryClientProvider` wrapping the app.

### `src/app/morning/page.tsx`
- Replace all `useRoutineStore()` data reads with query hooks
- Replace all store mutation calls with mutation hooks
- `runnerOpen`/`managerOpen` become local `useState` (still synced to URL param and sessionStorage)

### `src/app/usage/page.tsx`
- Replace `useUsageStore().usageMap` with `useUsageRecords().data`
- Replace `useRoutineStore().completionMap` with `useRoutineCompletions().data`

### `src/components/storeInitializer.tsx`
- Remove usage/routine store initialization
- Keep auth store initialization only
- TanStack queries self-initialize on component mount

### `src/components/bottomBar.tsx`
- Update navigation links (add `/plan`, update active state logic for new `/` route)

## Unchanged

- All API routes (`src/app/api/**`) — backend stays the same
- `src/lib/auth-store.ts` — Zustand, unchanged
- `src/lib/schemas.ts`, `src/lib/week.ts`, `src/lib/calendar.ts`, `src/lib/utils.ts`, `src/lib/env.ts`
- `src/lib/google.ts`, `src/lib/notion.ts`, `src/lib/supabase.ts`
- `src/auth.ts`
