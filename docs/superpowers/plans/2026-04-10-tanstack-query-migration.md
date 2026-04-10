# TanStack Query Migration + Store Refactor + Route Restructure

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Centralize all API/data-fetching into TanStack Query, remove Zustand stores that cache server state, restructure routes (`/` → dashboard, `/plan` → day planner).

**Architecture:** TanStack Query manages all server state (Supabase + API routes) with optimistic updates. Zustand kept only for auth (live subscription). API layer centralized in `src/lib/api/`. Route restructure moves planner to `/plan`, new dashboard at `/`.

**Tech Stack:** `@tanstack/react-query` v5, Zustand (auth only), Supabase JS, Next.js 16 App Router

---

### Task 1: QueryClient + Provider Setup

**Files:**
- Create: `src/lib/query-client.ts`
- Modify: `src/app/providers.tsx`

- [ ] **Step 1: Create QueryClient singleton**

```ts
// src/lib/query-client.ts
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,      // 5 min — single-user app, data rarely changes externally
      gcTime: 30 * 60 * 1000,         // 30 min
      retry: 1,                        // Supabase is reliable, fail fast
      refetchOnWindowFocus: true,      // replaces manual visibilitychange listeners
    },
  },
});
```

- [ ] **Step 2: Add QueryClientProvider to providers.tsx**

In `src/app/providers.tsx`, add the import and wrap `<SessionProvider>` children:

```tsx
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";
```

Wrap everything inside `<SessionProvider>` with `<QueryClientProvider client={queryClient}>`:

```tsx
<SessionProvider>
  <QueryClientProvider client={queryClient}>
    <StoreInitializer />
    <SupabaseSync />
    <SupabaseAuthProvider>
      {/* ...existing content unchanged... */}
    </SupabaseAuthProvider>
  </QueryClientProvider>
</SessionProvider>
```

- [ ] **Step 3: Verify build**

Run: `pnpm run build`
Expected: Clean build, no errors. The QueryClient is provided but not consumed yet.

- [ ] **Step 4: Commit**

```bash
git add src/lib/query-client.ts src/app/providers.tsx
git commit -m "feat: add TanStack Query provider and QueryClient config"
```

---

### Task 2: API Client + Query Keys

**Files:**
- Create: `src/lib/api/client.ts`
- Create: `src/lib/api/keys.ts`

- [ ] **Step 1: Create typed API client**

```ts
// src/lib/api/client.ts

/**
 * Typed fetch wrapper for Next.js API routes that use the { ok, error } envelope.
 * Throws on !ok so TanStack Query treats it as an error.
 */
export async function apiFetch<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });

  const data = await res.json();

  if (!res.ok || !data?.ok) {
    throw new Error(data?.error || `Request failed: ${res.status}`);
  }

  return data as T;
}
```

- [ ] **Step 2: Create query key factory**

```ts
// src/lib/api/keys.ts

export const queryKeys = {
  calendars: ["calendars"] as const,
  usage: {
    all: ["usage"] as const,
    records: () => ["usage", "records"] as const,
  },
  routine: {
    all: ["routine"] as const,
    actions: () => ["routine", "actions"] as const,
    records: (date: string) => ["routine", "records", date] as const,
    completions: () => ["routine", "completions"] as const,
  },
} as const;
```

- [ ] **Step 3: Verify build**

Run: `pnpm run build`
Expected: Clean build. Files exist but aren't imported anywhere yet.

- [ ] **Step 4: Commit**

```bash
git add src/lib/api/client.ts src/lib/api/keys.ts
git commit -m "feat: add API client wrapper and query key factory"
```

---

### Task 3: Usage Queries + Mutations (Replace usage-store)

**Files:**
- Create: `src/lib/api/usage.ts`
- Modify: `src/app/usage/page.tsx`
- Modify: `src/components/storeInitializer.tsx`

- [ ] **Step 1: Create usage query + mutation hooks**

```ts
// src/lib/api/usage.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSupabaseClient } from "@/lib/supabase";
import { useAuthStore } from "@/lib/auth-store";
import { toISODate } from "@/lib/utils";
import { queryKeys } from "./keys";

const TABLE = "usage_records";

function getUserId(): string | undefined {
  return useAuthStore.getState().user?.id;
}

type UsageMap = Record<string, boolean>;

async function fetchUsageRecords(): Promise<UsageMap> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from(TABLE).select("used_on");

  if (error || !data) throw new Error(error?.message || "Failed to fetch usage records");

  const map: UsageMap = {};
  for (const row of data) {
    map[(row as { used_on: string }).used_on] = true;
  }
  return map;
}

export function useUsageRecords() {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: queryKeys.usage.records(),
    queryFn: fetchUsageRecords,
    enabled: !!user,
  });
}

export function useMarkUsed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (date: Date = new Date()) => {
      const userId = getUserId();
      if (!userId) throw new Error("Not authenticated");

      const dateKey = toISODate(date);
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from(TABLE)
        .upsert({ user_id: userId, used_on: dateKey }, { onConflict: "user_id,used_on" });

      if (error) throw new Error(error.message);
      return dateKey;
    },
    onMutate: async (date: Date = new Date()) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.usage.records() });
      const previous = queryClient.getQueryData<UsageMap>(queryKeys.usage.records());
      const dateKey = toISODate(date);

      queryClient.setQueryData<UsageMap>(queryKeys.usage.records(), (old) => ({
        ...old,
        [dateKey]: true,
      }));

      return { previous };
    },
    onError: (_err, _date, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.usage.records(), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.usage.records() });
    },
  });
}

export function useToggleUsed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (date: Date) => {
      const userId = getUserId();
      if (!userId) throw new Error("Not authenticated");

      const dateKey = toISODate(date);
      const current = queryClient.getQueryData<UsageMap>(queryKeys.usage.records());
      const newValue = !current?.[dateKey];

      const supabase = getSupabaseClient();

      if (newValue) {
        const { error } = await supabase
          .from(TABLE)
          .upsert({ user_id: userId, used_on: dateKey }, { onConflict: "user_id,used_on" });
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase
          .from(TABLE)
          .delete()
          .eq("user_id", userId)
          .eq("used_on", dateKey);
        if (error) throw new Error(error.message);
      }

      return { dateKey, newValue };
    },
    onMutate: async (date: Date) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.usage.records() });
      const previous = queryClient.getQueryData<UsageMap>(queryKeys.usage.records());
      const dateKey = toISODate(date);
      const newValue = !previous?.[dateKey];

      queryClient.setQueryData<UsageMap>(queryKeys.usage.records(), (old) => ({
        ...old,
        [dateKey]: newValue,
      }));

      return { previous };
    },
    onError: (_err, _date, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.usage.records(), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.usage.records() });
    },
  });
}
```

- [ ] **Step 2: Update usage page to use query hooks**

In `src/app/usage/page.tsx`:

Replace imports:
```tsx
// REMOVE:
import { useUsageStore } from "@/lib/usage-store";
// ADD:
import { useUsageRecords } from "@/lib/api/usage";
```

Replace store usage (line 31):
```tsx
// REMOVE:
const { usageMap } = useUsageStore();
// ADD:
const { data: usageMap = {} } = useUsageRecords();
```

No other changes needed — `usageMap` is consumed identically.

- [ ] **Step 3: Remove usage store from StoreInitializer**

In `src/components/storeInitializer.tsx`:

Remove the usage store import and reinitialize call:
```tsx
// REMOVE these lines:
import { useUsageStore } from "@/lib/usage-store";
// ...
const reinitializeUsage = useUsageStore((s) => s.reinitialize);
// ...
reinitializeUsage();
```

The reinit effect should now only call `reinitializeRoutine()` (routine store still exists at this point):
```tsx
useEffect(() => {
  if (user?.id === prevUserId.current) return;
  prevUserId.current = user?.id;
  reinitializeRoutine();
}, [user?.id, reinitializeRoutine]);
```

TanStack Query handles cache invalidation automatically — when the user changes, the `enabled: !!user` condition re-evaluates and refetches.

- [ ] **Step 4: Verify build**

Run: `pnpm run build`
Expected: Clean build. Usage page now reads from TanStack Query. Home page still uses old store (will migrate in Task 6).

- [ ] **Step 5: Commit**

```bash
git add src/lib/api/usage.ts src/app/usage/page.tsx src/components/storeInitializer.tsx
git commit -m "feat: replace usage store with TanStack Query hooks"
```

---

### Task 4: Routine Queries + Mutations (Replace morning-routine-store)

**Files:**
- Create: `src/lib/api/routine.ts`

- [ ] **Step 1: Create routine query hooks**

```ts
// src/lib/api/routine.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSupabaseClient } from "@/lib/supabase";
import { useAuthStore } from "@/lib/auth-store";
import { toISODate } from "@/lib/utils";
import { queryKeys } from "./keys";

const ROUTINE_TABLE = "morning_routine_actions";
const COMPLETION_TABLE = "morning_routine_completions";
const ACTION_RECORDS_TABLE = "morning_routine_action_records";

function getUserId(): string | undefined {
  return useAuthStore.getState().user?.id;
}

// ── Types ──────────────────────────────────────────────

export type RoutineAction = {
  id: string;
  title: string;
  position: number;
};

export type RoutineActionRecord = {
  id: string;
  action_id: string;
  completed_on: string;
  completed: boolean;
};

type CompletionMap = Record<string, boolean>;
type ActionRecordMap = Record<string, RoutineActionRecord>;

// ── Queries ────────────────────────────────────────────

export function useRoutineActions() {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: queryKeys.routine.actions(),
    queryFn: async (): Promise<RoutineAction[]> => {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from(ROUTINE_TABLE)
        .select("id, title, position")
        .order("position", { ascending: true });

      if (error) throw new Error(error.message);
      return (data ?? []) as RoutineAction[];
    },
    enabled: !!user,
  });
}

export function useActionRecords(date: string) {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: queryKeys.routine.records(date),
    queryFn: async (): Promise<ActionRecordMap> => {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from(ACTION_RECORDS_TABLE)
        .select("*")
        .eq("completed_on", date);

      if (error) throw new Error(error.message);
      const map: ActionRecordMap = {};
      for (const record of (data ?? []) as RoutineActionRecord[]) {
        map[record.action_id] = record;
      }
      return map;
    },
    enabled: !!user,
  });
}

export function useRoutineCompletions() {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: queryKeys.routine.completions(),
    queryFn: async (): Promise<CompletionMap> => {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from(COMPLETION_TABLE)
        .select("completed_on, completed");

      if (error) throw new Error(error.message);
      const map: CompletionMap = {};
      for (const row of data ?? []) {
        map[(row as { completed_on: string; completed: boolean }).completed_on] = Boolean(
          (row as { completed_on: string; completed: boolean }).completed
        );
      }
      return map;
    },
    enabled: !!user,
  });
}

// ── Mutations ──────────────────────────────────────────

export function useAddAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (title: string) => {
      const userId = getUserId();
      if (!userId) throw new Error("Not authenticated");

      const actions = queryClient.getQueryData<RoutineAction[]>(queryKeys.routine.actions()) ?? [];
      const newAction: RoutineAction = {
        id: crypto.randomUUID(),
        title: title.trim(),
        position: actions.length,
      };

      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from(ROUTINE_TABLE)
        .upsert({ ...newAction, user_id: userId }, { onConflict: "id" });

      if (error) throw new Error(error.message);
      return newAction;
    },
    onMutate: async (title: string) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.routine.actions() });
      const previous = queryClient.getQueryData<RoutineAction[]>(queryKeys.routine.actions()) ?? [];
      const newAction: RoutineAction = {
        id: crypto.randomUUID(),
        title: title.trim(),
        position: previous.length,
      };
      queryClient.setQueryData<RoutineAction[]>(queryKeys.routine.actions(), [...previous, newAction]);
      return { previous };
    },
    onError: (_err, _title, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.routine.actions(), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.routine.actions() });
    },
  });
}

export function useUpdateAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (action: RoutineAction) => {
      const userId = getUserId();
      if (!userId) throw new Error("Not authenticated");

      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from(ROUTINE_TABLE)
        .upsert({ ...action, user_id: userId }, { onConflict: "id" });

      if (error) throw new Error(error.message);
      return action;
    },
    onMutate: async (action: RoutineAction) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.routine.actions() });
      const previous = queryClient.getQueryData<RoutineAction[]>(queryKeys.routine.actions()) ?? [];
      queryClient.setQueryData<RoutineAction[]>(
        queryKeys.routine.actions(),
        previous.map((a) => (a.id === action.id ? action : a))
      );
      return { previous };
    },
    onError: (_err, _action, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.routine.actions(), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.routine.actions() });
    },
  });
}

export function useDeleteAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const userId = getUserId();
      if (!userId) throw new Error("Not authenticated");

      const actions = queryClient.getQueryData<RoutineAction[]>(queryKeys.routine.actions()) ?? [];
      const filtered = actions.filter((a) => a.id !== id);
      const reordered = filtered.map((a, index) => ({ ...a, position: index }));

      const supabase = getSupabaseClient();
      await Promise.all([
        supabase.from(ROUTINE_TABLE).delete().eq("id", id).eq("user_id", userId),
        supabase
          .from(ROUTINE_TABLE)
          .upsert(
            reordered.map((a) => ({ ...a, user_id: userId })),
            { onConflict: "id" }
          ),
      ]);

      return reordered;
    },
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.routine.actions() });
      const previous = queryClient.getQueryData<RoutineAction[]>(queryKeys.routine.actions()) ?? [];
      const filtered = previous.filter((a) => a.id !== id);
      const reordered = filtered.map((a, index) => ({ ...a, position: index }));
      queryClient.setQueryData<RoutineAction[]>(queryKeys.routine.actions(), reordered);

      // Also clean up action records cache
      const today = toISODate(new Date());
      const prevRecords = queryClient.getQueryData<ActionRecordMap>(queryKeys.routine.records(today));
      if (prevRecords) {
        const { [id]: _removed, ...rest } = prevRecords;
        queryClient.setQueryData<ActionRecordMap>(queryKeys.routine.records(today), rest);
      }

      return { previous, prevRecords };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.routine.actions(), context.previous);
      }
      if (context?.prevRecords) {
        const today = toISODate(new Date());
        queryClient.setQueryData(queryKeys.routine.records(today), context.prevRecords);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.routine.all });
    },
  });
}

export function useReorderActions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ startIndex, endIndex }: { startIndex: number; endIndex: number }) => {
      const userId = getUserId();
      if (!userId) throw new Error("Not authenticated");

      const actions = queryClient.getQueryData<RoutineAction[]>(queryKeys.routine.actions()) ?? [];
      const reordered = [...actions];
      const [moved] = reordered.splice(startIndex, 1);
      reordered.splice(endIndex, 0, moved);
      const normalized = reordered.map((a, index) => ({ ...a, position: index }));

      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from(ROUTINE_TABLE)
        .upsert(
          normalized.map((a) => ({ ...a, user_id: userId })),
          { onConflict: "id" }
        );

      if (error) throw new Error(error.message);
      return normalized;
    },
    onMutate: async ({ startIndex, endIndex }: { startIndex: number; endIndex: number }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.routine.actions() });
      const previous = queryClient.getQueryData<RoutineAction[]>(queryKeys.routine.actions()) ?? [];
      const reordered = [...previous];
      const [moved] = reordered.splice(startIndex, 1);
      reordered.splice(endIndex, 0, moved);
      const normalized = reordered.map((a, index) => ({ ...a, position: index }));
      queryClient.setQueryData<RoutineAction[]>(queryKeys.routine.actions(), normalized);
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.routine.actions(), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.routine.actions() });
    },
  });
}

export function useToggleActionCompletion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ actionId, date = new Date() }: { actionId: string; date?: Date }) => {
      const userId = getUserId();
      if (!userId) throw new Error("Not authenticated");

      const dateKey = toISODate(date);
      const records = queryClient.getQueryData<ActionRecordMap>(queryKeys.routine.records(dateKey)) ?? {};
      const existing = records[actionId];
      const newCompleted = !existing?.completed;

      const updated: RoutineActionRecord = {
        id: existing?.id || crypto.randomUUID(),
        action_id: actionId,
        completed_on: dateKey,
        completed: newCompleted,
      };

      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from(ACTION_RECORDS_TABLE)
        .upsert(
          { ...updated, user_id: userId },
          { onConflict: "user_id,action_id,completed_on" }
        );

      if (error) throw new Error(error.message);
      return updated;
    },
    onMutate: async ({ actionId, date = new Date() }: { actionId: string; date?: Date }) => {
      const dateKey = toISODate(date);
      await queryClient.cancelQueries({ queryKey: queryKeys.routine.records(dateKey) });
      const previous = queryClient.getQueryData<ActionRecordMap>(queryKeys.routine.records(dateKey)) ?? {};
      const existing = previous[actionId];
      const newCompleted = !existing?.completed;

      const updated: RoutineActionRecord = {
        id: existing?.id || crypto.randomUUID(),
        action_id: actionId,
        completed_on: dateKey,
        completed: newCompleted,
      };

      queryClient.setQueryData<ActionRecordMap>(queryKeys.routine.records(dateKey), {
        ...previous,
        [actionId]: updated,
      });

      return { previous, dateKey };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous && context?.dateKey) {
        queryClient.setQueryData(queryKeys.routine.records(context.dateKey), context.previous);
      }
    },
    onSettled: (_data, _err, vars) => {
      const dateKey = toISODate(vars.date ?? new Date());
      queryClient.invalidateQueries({ queryKey: queryKeys.routine.records(dateKey) });
    },
  });
}

export function useMarkDayComplete() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (date: Date = new Date()) => {
      const userId = getUserId();
      if (!userId) throw new Error("Not authenticated");

      const dateKey = toISODate(date);
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from(COMPLETION_TABLE)
        .upsert(
          { user_id: userId, completed_on: dateKey, completed: true },
          { onConflict: "user_id,completed_on" }
        );

      if (error) throw new Error(error.message);
      return dateKey;
    },
    onMutate: async (date: Date = new Date()) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.routine.completions() });
      const previous = queryClient.getQueryData<CompletionMap>(queryKeys.routine.completions());
      const dateKey = toISODate(date);

      queryClient.setQueryData<CompletionMap>(queryKeys.routine.completions(), (old) => ({
        ...old,
        [dateKey]: true,
      }));

      return { previous };
    },
    onError: (_err, _date, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.routine.completions(), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.routine.completions() });
    },
  });
}
```

- [ ] **Step 2: Verify build**

Run: `pnpm run build`
Expected: Clean build. Hooks exist but aren't consumed yet.

- [ ] **Step 3: Commit**

```bash
git add src/lib/api/routine.ts
git commit -m "feat: add routine query and mutation hooks with optimistic updates"
```

---

### Task 5: Migrate Morning Page

**Files:**
- Modify: `src/app/morning/page.tsx`

- [ ] **Step 1: Replace store imports with query hooks**

Replace the import and store destructure at the top of the file:

```tsx
// REMOVE:
import { useRoutineStore } from "@/lib/morning-routine-store";

// ADD:
import {
  useRoutineActions,
  useActionRecords,
  useRoutineCompletions,
  useAddAction,
  useUpdateAction,
  useDeleteAction,
  useReorderActions,
  useToggleActionCompletion,
  useMarkDayComplete,
} from "@/lib/api/routine";
```

- [ ] **Step 2: Replace store destructure with hooks**

Replace the entire `const { ... } = useRoutineStore();` block (lines 44-60) with:

```tsx
const today = toISODate(new Date());

// Queries
const { data: actions = [], isLoading: loading } = useRoutineActions();
const { data: actionRecords = {} } = useActionRecords(today);
const { data: completionMap = {} } = useRoutineCompletions();

// Mutations
const addActionMut = useAddAction();
const updateActionMut = useUpdateAction();
const deleteActionMut = useDeleteAction();
const reorderActionsMut = useReorderActions();
const toggleCompletionMut = useToggleActionCompletion();
const markDayCompleteMut = useMarkDayComplete();

// UI state — local, not server state
const [runnerOpen, setRunnerOpen] = useState(() => {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem("morning-routine-ui-runner") === "true";
  } catch {
    return false;
  }
});
const [managerOpen, setManagerOpen] = useState(() => {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem("morning-routine-ui-manager") === "true";
  } catch {
    return false;
  }
});

// Persist UI state to sessionStorage
useEffect(() => {
  try {
    sessionStorage.setItem("morning-routine-ui-runner", String(runnerOpen));
  } catch { /* ignore */ }
}, [runnerOpen]);

useEffect(() => {
  try {
    sessionStorage.setItem("morning-routine-ui-manager", String(managerOpen));
  } catch { /* ignore */ }
}, [managerOpen]);
```

- [ ] **Step 3: Remove the manual visibilitychange listener**

Delete the entire `useEffect` block (lines 62-73) that calls `refreshTodayRecords()` on `visibilitychange`. TanStack Query's `refetchOnWindowFocus: true` handles this automatically.

- [ ] **Step 4: Update handler functions to use mutation hooks**

Replace handler calls throughout the component. The function signatures stay the same but call mutation hooks:

```tsx
const handleAddAction = async () => {
  if (!titleInput.trim()) return;
  await addActionMut.mutateAsync(titleInput);
  setTitleInput("");
};

const handleMoveAction = async (index: number, direction: number) => {
  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= actions.length) return;
  await reorderActionsMut.mutateAsync({ startIndex: index, endIndex: targetIndex });
};

const handleMoveToNext = useCallback(async () => {
  if (!currentAction) return;

  await toggleCompletionMut.mutateAsync({ actionId: currentAction.id });

  if (currentIndex >= actions.length - 1) {
    await markDayCompleteMut.mutateAsync();
    setRunnerOpen(false);
  }
}, [currentAction, currentIndex, actions.length, toggleCompletionMut, markDayCompleteMut]);
```

Replace inline calls in JSX:
- `toggleActionCompletion(action.id)` → `toggleCompletionMut.mutate({ actionId: action.id })`
- `updateAction({ ...action, title: e.target.value })` → `updateActionMut.mutate({ ...action, title: e.target.value })`
- `deleteAction(action.id)` → `deleteActionMut.mutate(action.id)`

- [ ] **Step 5: Verify build**

Run: `pnpm run build`
Expected: Clean build. Morning page now reads from TanStack Query.

- [ ] **Step 6: Commit**

```bash
git add src/app/morning/page.tsx
git commit -m "feat: migrate morning page from Zustand store to TanStack Query hooks"
```

---

### Task 6: Plan Page Mutations + Route Restructure

**Files:**
- Create: `src/lib/api/plan.ts`
- Create: `src/app/plan/page.tsx` (moved from `src/app/page.tsx`)
- Create: `src/app/page.tsx` (new dashboard)
- Modify: `src/components/bottomBar.tsx`

- [ ] **Step 1: Create plan API hooks**

```ts
// src/lib/api/plan.ts
import { useQuery, useMutation } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiFetch } from "./client";
import { queryKeys } from "./keys";
import { useAuthStore } from "@/lib/auth-store";

// ── Types ──────────────────────────────────────────────

type UserCalendar = {
  id: string;
  summary: string;
  primary?: boolean;
};

type CalendarsResponse = {
  ok: boolean;
  calendars: UserCalendar[];
};

type PrepareRequest = {
  timeZone: string;
  calendarId?: string;
};

type PrepareResponse = {
  ok: boolean;
  today: string;
  nowLocal: string;
  busySummary: string[];
  busyIntervalsIso: string[];
  notionRules: string;
};

type GenerateRequest = {
  text: string;
  timeZone: string;
  today: string;
  nowLocal: string;
  busySummary: string[];
  busyIntervalsIso: string[];
  notionRules: string;
};

export type Task = {
  title: string;
  date: string;
  start_time: string;
  duration_minutes: number;
  difficulty: "simple" | "normal" | "deep";
  notes?: string;
};

type GenerateResponse = {
  ok: boolean;
  plan: { tasks: Task[] };
  warning?: string;
  conflicts: unknown;
  rules_preview: unknown;
};

type CreateEventsRequest = {
  plan: { tasks: Task[] };
  timeZone: string;
  calendarId?: string;
};

type CreateEventsResponse = {
  ok: boolean;
  createdCount: number;
  warning?: string;
  conflicts?: unknown;
  errors?: unknown;
};

// ── Queries ────────────────────────────────────────────

export function useCalendars() {
  const { data: session } = useSession();
  return useQuery({
    queryKey: queryKeys.calendars,
    queryFn: () => apiFetch<CalendarsResponse>("/api/calendar/calendars"),
    enabled: !!session,
    select: (data) => data.calendars,
  });
}

// ── Mutations ──────────────────────────────────────────

export function usePreparePlan() {
  return useMutation({
    mutationFn: (request: PrepareRequest) =>
      apiFetch<PrepareResponse>("/api/plan/prepare", {
        method: "POST",
        body: JSON.stringify(request),
      }),
  });
}

export function useGeneratePlan() {
  return useMutation({
    mutationFn: (request: GenerateRequest) =>
      apiFetch<GenerateResponse>("/api/plan", {
        method: "POST",
        body: JSON.stringify(request),
      }),
  });
}

export function useCreateEvents() {
  return useMutation({
    mutationFn: (request: CreateEventsRequest) =>
      apiFetch<CreateEventsResponse>("/api/calendar/create", {
        method: "POST",
        body: JSON.stringify(request),
      }),
  });
}
```

- [ ] **Step 2: Move current home page to /plan**

Copy `src/app/page.tsx` to `src/app/plan/page.tsx` and refactor it:

Replace imports:
```tsx
// REMOVE:
import { useUsageStore } from "@/lib/usage-store";
// ADD:
import { useUsageRecords, useMarkUsed } from "@/lib/api/usage";
import { useCalendars, usePreparePlan, useGeneratePlan, useCreateEvents, type Task } from "@/lib/api/plan";
```

Replace store/state usage. Remove the local `Task` and `UserCalendar` type definitions (they come from `@/lib/api/plan` now).

Replace state declarations — remove `loading`, `creating`, `msg`, `calendars`, `calendarsLoading`, and the calendar `useEffect`. Replace with:

```tsx
const { data: usageMap = {} } = useUsageRecords();
const markUsed = useMarkUsed();

const { data: calendars = [], isLoading: calendarsLoading } = useCalendars();
const [selectedCalendarId, setSelectedCalendarId] = useState<string>("primary");

const preparePlan = usePreparePlan();
const generatePlan = useGeneratePlan();
const createEvents = useCreateEvents();

// Derive loading/creating states from mutations
const loading = preparePlan.isPending || generatePlan.isPending;
const creating = createEvents.isPending;

// Derive message from mutation states
const msg = useMemo(() => {
  if (preparePlan.isPending) return "Fetching calendar events…";
  if (generatePlan.isPending) return "Generating plan…";
  if (preparePlan.error) return preparePlan.error.message;
  if (generatePlan.error) return generatePlan.error.message;
  if (createEvents.error) return createEvents.error.message;
  if (generatePlan.data?.warning) return generatePlan.data.warning;
  if (createEvents.data) {
    const selectedLabel = calendars.find((c) => c.id === selectedCalendarId)?.summary ?? selectedCalendarId;
    const base = `Created ${createEvents.data.createdCount} events in "${selectedLabel}"`;
    return createEvents.data.warning ? `${base}. ${createEvents.data.warning}` : base;
  }
  return "";
}, [preparePlan, generatePlan, createEvents, calendars, selectedCalendarId]);
```

Set primary calendar when calendars load:
```tsx
useEffect(() => {
  if (calendars.length === 0) return;
  const primary = calendars.find((c) => c.primary);
  if (primary) setSelectedCalendarId(primary.id);
}, [calendars]);
```

Replace `generatePlan` function:
```tsx
async function handleGeneratePlan() {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Reset prior mutation states
  preparePlan.reset();
  generatePlan.reset();
  createEvents.reset();
  setPlan(null);

  const prepareData = await preparePlan.mutateAsync({ timeZone, calendarId: selectedCalendarId });

  const generateData = await generatePlan.mutateAsync({
    text,
    timeZone,
    today: prepareData.today,
    nowLocal: prepareData.nowLocal,
    busySummary: prepareData.busySummary,
    busyIntervalsIso: prepareData.busyIntervalsIso,
    notionRules: prepareData.notionRules,
  });

  setPlan(generateData.plan);
  setDraftTasks(generateData.plan?.tasks ?? []);
  markUsed.mutate(new Date());
}
```

Wrap in try/catch in JSX onClick:
```tsx
onClick={async () => {
  try { await handleGeneratePlan(); } catch { /* errors shown via msg */ }
}}
```

Replace `confirmAndCreate` function:
```tsx
async function handleConfirmAndCreate() {
  if (!plan) return;

  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const data = await createEvents.mutateAsync({
    plan: { tasks: draftTasks },
    timeZone,
    calendarId: selectedCalendarId,
  });

  setText("");
  localStorage.removeItem("planner-input-text");
  setPlan(null);
  setDraftTasks([]);
}
```

Update `<BottomBar active="plan" />` remains the same.

- [ ] **Step 3: Create new dashboard home page**

```tsx
// src/app/page.tsx
"use client";

import { useMemo } from "react";
import { CalendarDaysIcon, SunIcon, Squares2X2Icon } from "@heroicons/react/24/outline";
import { Flame, ArrowRight } from "lucide-react";
import Link from "next/link";
import { toISODate } from "@/lib/utils";
import { useUsageRecords } from "@/lib/api/usage";
import { useRoutineCompletions } from "@/lib/api/routine";
import BottomBar from "@/components/bottomBar";
import PageHeader from "@/components/pageHeader";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function DashboardPage() {
  const { data: usageMap = {} } = useUsageRecords();
  const { data: completionMap = {} } = useRoutineCompletions();

  const todayKey = useMemo(() => toISODate(new Date()), []);

  const plannedToday = !!usageMap[todayKey];
  const routineToday = !!completionMap[todayKey];

  const planStreak = useMemo(() => {
    let streak = 0;
    const cursor = new Date();
    for (let i = 0; i < 365; i++) {
      if (usageMap[toISODate(cursor)]) {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  }, [usageMap]);

  const routineStreak = useMemo(() => {
    let streak = 0;
    const cursor = new Date();
    for (let i = 0; i < 365; i++) {
      if (completionMap[toISODate(cursor)]) {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  }, [completionMap]);

  const todayLabel = useMemo(() => {
    return new Date().toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  }, []);

  return (
    <main className="min-h-screen relative overflow-hidden bg-[#f8f6f1] text-[#0c0c0c] selection:bg-primary/20">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#ffffff_0%,_#f8f6f1_55%,_#f1efe8_100%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-40 bg-[radial-gradient(#1a1a1a1a_1px,transparent_1px)] [background-size:24px_24px]" />

      <div className="relative z-10 max-w-4xl mx-auto px-6 pt-10 pb-36 flex min-h-screen flex-col">
        <PageHeader
          eyebrow="Dashboard"
          title={todayLabel}
          icon={<Squares2X2Icon className="size-6 text-black/40" />}
        />

        <section className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* Plan Card */}
          <Link href="/plan" className="group">
            <Card className="border-black/5 bg-white/60 backdrop-blur-xl shadow-2xl shadow-black/5 overflow-hidden transition-all group-hover:shadow-3xl group-hover:bg-white/80 h-full">
              <CardContent className="p-6 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <CalendarDaysIcon className="size-5 text-primary" />
                  </div>
                  <ArrowRight className="size-4 text-black/20 group-hover:text-black/50 transition-colors" />
                </div>
                <div>
                  <h3 className="font-semibold tracking-tight">Day Planner</h3>
                  <p className="text-xs text-black/40 mt-1">AI-powered daily scheduling</p>
                </div>
                <div className="flex items-center gap-3 mt-auto pt-2">
                  <Badge
                    variant="outline"
                    className={`text-[9px] uppercase tracking-[0.2em] font-bold border-none ${
                      plannedToday ? "bg-primary/10 text-primary" : "bg-black/5 text-black/30"
                    }`}
                  >
                    {plannedToday ? "Planned" : "Not yet"}
                  </Badge>
                  {planStreak > 0 && (
                    <span className="flex items-center gap-1 text-xs font-bold text-primary">
                      {planStreak} <Flame className="size-3 fill-current" />
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Morning Card */}
          <Link href="/morning" className="group">
            <Card className="border-black/5 bg-white/60 backdrop-blur-xl shadow-2xl shadow-black/5 overflow-hidden transition-all group-hover:shadow-3xl group-hover:bg-white/80 h-full">
              <CardContent className="p-6 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="h-10 w-10 rounded-2xl bg-secondary/10 flex items-center justify-center">
                    <SunIcon className="size-5 text-secondary" />
                  </div>
                  <ArrowRight className="size-4 text-black/20 group-hover:text-black/50 transition-colors" />
                </div>
                <div>
                  <h3 className="font-semibold tracking-tight">Morning Routine</h3>
                  <p className="text-xs text-black/40 mt-1">Build consistent habits</p>
                </div>
                <div className="flex items-center gap-3 mt-auto pt-2">
                  <Badge
                    variant="outline"
                    className={`text-[9px] uppercase tracking-[0.2em] font-bold border-none ${
                      routineToday ? "bg-secondary/10 text-secondary" : "bg-black/5 text-black/30"
                    }`}
                  >
                    {routineToday ? "Completed" : "Not yet"}
                  </Badge>
                  {routineStreak > 0 && (
                    <span className="flex items-center gap-1 text-xs font-bold text-secondary">
                      {routineStreak} <Flame className="size-3 fill-current" />
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Records Card */}
          <Link href="/usage" className="group">
            <Card className="border-black/5 bg-white/60 backdrop-blur-xl shadow-2xl shadow-black/5 overflow-hidden transition-all group-hover:shadow-3xl group-hover:bg-white/80 h-full">
              <CardContent className="p-6 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="h-10 w-10 rounded-2xl bg-black/5 flex items-center justify-center">
                    <Squares2X2Icon className="size-5 text-black/40" />
                  </div>
                  <ArrowRight className="size-4 text-black/20 group-hover:text-black/50 transition-colors" />
                </div>
                <div>
                  <h3 className="font-semibold tracking-tight">Records</h3>
                  <p className="text-xs text-black/40 mt-1">Streaks and consistency</p>
                </div>
                <div className="flex items-center gap-3 mt-auto pt-2">
                  <Badge
                    variant="outline"
                    className="text-[9px] uppercase tracking-[0.2em] font-bold border-none bg-black/5 text-black/30"
                  >
                    {Object.values(usageMap).filter(Boolean).length + Object.values(completionMap).filter(Boolean).length} days tracked
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </Link>
        </section>
      </div>

      <BottomBar active="home" />
    </main>
  );
}
```

- [ ] **Step 4: Update BottomBar for new routes**

In `src/components/bottomBar.tsx`:

Update the type to include "home":
```tsx
type BottomBarProps = {
  active: "home" | "usage" | "plan" | "morning";
};
```

Update the Plan link `href` from `"/"` to `"/plan"`, and add a Home link:
```tsx
<Link
  className={`${base} ${active === "home" ? activeClasses : inactive}`}
  href="/"
>
  Home
</Link>
<Link
  className={`${base} ${active === "usage" ? activeClasses : inactive}`}
  href="/usage"
>
  All
</Link>
<Link
  className={`${base} ${active === "plan" ? activeClasses : inactive}`}
  href="/plan"
>
  Plan
</Link>
<Link
  className={`${base} ${active === "morning" ? activeClasses : inactive}`}
  href="/morning"
>
  Morning
</Link>
```

- [ ] **Step 5: Verify build**

Run: `pnpm run build`
Expected: Clean build. All routes work, plan page at `/plan`, dashboard at `/`.

- [ ] **Step 6: Commit**

```bash
git add src/lib/api/plan.ts src/app/plan/page.tsx src/app/page.tsx src/components/bottomBar.tsx
git commit -m "feat: add plan API hooks, move planner to /plan, create dashboard at /"
```

---

### Task 7: Cleanup — Delete Old Stores + Simplify StoreInitializer

**Files:**
- Delete: `src/lib/usage-store.ts`
- Delete: `src/lib/morning-routine-store.ts`
- Modify: `src/components/storeInitializer.tsx`
- Modify: `src/app/usage/page.tsx` (if not already updated for routine)

- [ ] **Step 1: Update usage page to use routine query hooks**

In `src/app/usage/page.tsx`:

```tsx
// REMOVE:
import { useRoutineStore } from "@/lib/morning-routine-store";
// ADD:
import { useRoutineCompletions } from "@/lib/api/routine";
```

Replace:
```tsx
// REMOVE:
const { completionMap } = useRoutineStore();
// ADD:
const { data: completionMap = {} } = useRoutineCompletions();
```

- [ ] **Step 2: Simplify StoreInitializer**

Replace entire `src/components/storeInitializer.tsx` with:

```tsx
"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/lib/auth-store";

export default function StoreInitializer() {
  const initializeAuth = useAuthStore((s) => s.initialize);

  useEffect(() => {
    const unsubscribe = initializeAuth();
    return unsubscribe;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
```

No more usage/routine reinit — TanStack Query handles cache lifecycle via `enabled: !!user`.

- [ ] **Step 3: Delete old store files**

```bash
rm src/lib/usage-store.ts src/lib/morning-routine-store.ts
```

- [ ] **Step 4: Verify no remaining imports of deleted stores**

Run: `grep -r "usage-store\|morning-routine-store" src/`
Expected: No results.

- [ ] **Step 5: Verify build**

Run: `pnpm run build`
Expected: Clean build with no errors.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor: delete Zustand usage/routine stores, simplify StoreInitializer"
```

---

### Task 8: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update architecture section**

Update the CLAUDE.md to reflect:
- New route structure (`/` = dashboard, `/plan` = day planner)
- TanStack Query for server state, Zustand for auth only
- New `src/lib/api/` directory structure
- Deleted stores

Key sections to update:
- **Architecture** table: add `/` dashboard, change `/` → `/plan`
- **State Management**: replace "Two Zustand stores" with TanStack Query description
- **Key data flow**: update to mention mutation hooks
- Add new section for **API Layer** (`src/lib/api/`)
- Remove references to `usage-store.ts` and `morning-routine-store.ts`

- [ ] **Step 2: Verify accuracy**

Read through the updated CLAUDE.md and verify all file paths and descriptions match the actual codebase.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md for TanStack Query migration and route restructure"
```

---

### Task Summary

| Task | What | Files Changed |
|------|------|---------------|
| 1 | QueryClient + Provider | 2 (1 new, 1 modified) |
| 2 | API client + keys | 2 (2 new) |
| 3 | Usage queries/mutations | 3 (1 new, 2 modified) |
| 4 | Routine queries/mutations | 1 (1 new) |
| 5 | Migrate morning page | 1 (1 modified) |
| 6 | Plan hooks + route restructure | 4 (3 new, 1 modified) |
| 7 | Delete stores + cleanup | 4 (2 deleted, 2 modified) |
| 8 | Update CLAUDE.md | 1 (1 modified) |
