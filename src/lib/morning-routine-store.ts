import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { getSupabaseClient } from "@/lib/supabase";
import { useAuthStore } from "@/lib/auth-store";
import { toISODate } from "@/lib/utils";

function getUserId(): string | undefined {
  return useAuthStore.getState().user?.id;
}

const ROUTINE_TABLE = "morning_routine_actions";
const COMPLETION_TABLE = "morning_routine_completions";
const ACTION_RECORDS_TABLE = "morning_routine_action_records";

// Types
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

interface RoutineStore {
  // Server-fetched state
  actions: RoutineAction[];
  actionRecords: Record<string, RoutineActionRecord>;
  completionMap: Record<string, boolean>;
  loading: boolean;
  initialized: boolean;

  // Fix #2 (issue #1): UI state lifted into the store so it survives React remounts.
  // Fix #3 (issue #1): These two fields are persisted via sessionStorage (see persist config).
  runnerOpen: boolean;
  managerOpen: boolean;
  setRunnerOpen: (open: boolean) => void;
  setManagerOpen: (open: boolean) => void;

  // Data actions
  initialize: () => Promise<void>;
  reinitialize: () => Promise<void>;
  addAction: (title: string) => Promise<void>;
  updateAction: (action: RoutineAction) => Promise<void>;
  deleteAction: (id: string) => Promise<void>;
  reorderActions: (startIndex: number, endIndex: number) => Promise<void>;
  toggleActionCompletion: (actionId: string, date?: Date) => Promise<void>;
  setDayCompletion: (date: Date, completed: boolean) => Promise<void>;
  markDayComplete: (date?: Date) => Promise<void>;
  refreshTodayRecords: () => Promise<void>;
}

export const useRoutineStore = create<RoutineStore>()(
  persist(
    (set, get) => ({
  // Initial state
  actions: [],
  actionRecords: {},
  completionMap: {},
  loading: true,
  initialized: false,

  // UI state (Fix #2 — in store so React remounts don't reset it)
  runnerOpen: false,
  managerOpen: false,
  setRunnerOpen: (open) => set({ runnerOpen: open }),
  setManagerOpen: (open) => set({ managerOpen: open }),

  // Initialize - fetch all data once (idempotent)
  initialize: async () => {
    if (typeof window === "undefined") return;
    if (get().initialized) return;

    set({ initialized: true });

    const supabase = getSupabaseClient();
    const today = toISODate(new Date());

    try {
      const [actionsRes, recordsRes, completionsRes] = await Promise.all([
        supabase.from(ROUTINE_TABLE).select("*").order("position", { ascending: true }),
        supabase.from(ACTION_RECORDS_TABLE).select("*").eq("completed_on", today),
        supabase.from(COMPLETION_TABLE).select("*"),
      ]);

      const actions = (actionsRes.data || []) as RoutineAction[];
      const records = (recordsRes.data || []) as RoutineActionRecord[];
      const completions = completionsRes.data || [];

      const actionRecords: Record<string, RoutineActionRecord> = {};
      records.forEach((record) => {
        actionRecords[record.action_id] = record;
      });

      const completionMap: Record<string, boolean> = {};
      completions.forEach((row: any) => {
        completionMap[row.completed_on] = Boolean(row.completed);
      });

      set({ actions, actionRecords, completionMap, loading: false });
    } catch (error) {
      console.error("Failed to initialize routine store:", error);
      set({ loading: false, initialized: false });
    }
  },

  // Force re-fetch (e.g. after auth state change)
  reinitialize: async () => {
    set({ initialized: false, loading: true, actions: [], actionRecords: {}, completionMap: {} });
    await get().initialize();
  },

  // Add new action
  addAction: async (title: string) => {
    if (typeof window === "undefined" || !title.trim()) return;

    const userId = getUserId();
    if (!userId) return;

    const { actions } = get();
    const newAction: RoutineAction = {
      id: crypto.randomUUID(),
      title: title.trim(),
      position: actions.length,
    };

    set({ actions: [...actions, newAction] });

    const supabase = getSupabaseClient();
    await supabase
      .from(ROUTINE_TABLE)
      .upsert({ ...newAction, user_id: userId }, { onConflict: "id" });
  },

  // Update action
  updateAction: async (action: RoutineAction) => {
    if (typeof window === "undefined") return;

    const userId = getUserId();
    if (!userId) return;

    const { actions } = get();
    const updated = actions.map((a) => (a.id === action.id ? action : a));
    set({ actions: updated });

    const supabase = getSupabaseClient();
    await supabase
      .from(ROUTINE_TABLE)
      .upsert({ ...action, user_id: userId }, { onConflict: "id" });
  },

  // Delete action
  deleteAction: async (id: string) => {
    if (typeof window === "undefined") return;

    const userId = getUserId();
    if (!userId) return;

    const { actions, actionRecords } = get();
    const filtered = actions.filter((a) => a.id !== id);
    const reordered = filtered.map((a, index) => ({ ...a, position: index }));

    const { [id]: _removed, ...remainingRecords } = actionRecords;
    set({ actions: reordered, actionRecords: remainingRecords });

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
  },

  // Reorder actions
  reorderActions: async (startIndex: number, endIndex: number) => {
    if (typeof window === "undefined") return;

    const userId = getUserId();
    if (!userId) return;

    const { actions } = get();
    const reordered = [...actions];
    const [moved] = reordered.splice(startIndex, 1);
    reordered.splice(endIndex, 0, moved);

    const normalized = reordered.map((a, index) => ({ ...a, position: index }));
    set({ actions: normalized });

    const supabase = getSupabaseClient();
    await supabase
      .from(ROUTINE_TABLE)
      .upsert(
        normalized.map((a) => ({ ...a, user_id: userId })),
        { onConflict: "id" }
      );
  },

  // Toggle action completion
  toggleActionCompletion: async (actionId: string, date = new Date()) => {
    if (typeof window === "undefined") return;

    const userId = getUserId();
    if (!userId) return;

    const { actionRecords } = get();
    const existing = actionRecords[actionId];
    const newCompleted = !existing?.completed;
    const dateKey = toISODate(date);

    const updated: RoutineActionRecord = {
      id: existing?.id || crypto.randomUUID(),
      action_id: actionId,
      completed_on: dateKey,
      completed: newCompleted,
    };

    set({ actionRecords: { ...actionRecords, [actionId]: updated } });

    const supabase = getSupabaseClient();
    await supabase
      .from(ACTION_RECORDS_TABLE)
      .upsert(
        { ...updated, user_id: userId },
        { onConflict: "user_id,action_id,completed_on" }
      );
  },

  // Set day completion
  setDayCompletion: async (date: Date, completed: boolean) => {
    if (typeof window === "undefined") return;

    const userId = getUserId();
    if (!userId) return;

    const { completionMap } = get();
    const dateKey = toISODate(date);

    set({ completionMap: { ...completionMap, [dateKey]: completed } });

    const supabase = getSupabaseClient();
    await supabase
      .from(COMPLETION_TABLE)
      .upsert(
        { user_id: userId, completed_on: dateKey, completed },
        { onConflict: "user_id,completed_on" }
      );
  },

  // Mark entire day as complete
  markDayComplete: async (date = new Date()) => {
    if (typeof window === "undefined") return;
    await get().setDayCompletion(date, true);
  },

  // Refresh today's records (for visibility change)
  refreshTodayRecords: async () => {
    if (typeof window === "undefined") return;

    const supabase = getSupabaseClient();
    const today = toISODate(new Date());

    const [recordsRes, completionsRes] = await Promise.all([
      supabase.from(ACTION_RECORDS_TABLE).select("*").eq("completed_on", today),
      supabase.from(COMPLETION_TABLE).select("*").eq("completed_on", today),
    ]);

    const records = (recordsRes.data || []) as RoutineActionRecord[];
    const actionRecords: Record<string, RoutineActionRecord> = {};
    records.forEach((record) => {
      actionRecords[record.action_id] = record;
    });

    const completions = completionsRes.data || [];
    const prevCompletionMap = get().completionMap;
    const completionMap = { ...prevCompletionMap };
    if (completions.length > 0) {
      completionMap[today] = Boolean(completions[0].completed);
    }

    set({ actionRecords, completionMap });
  },
    }),
    {
      // Fix #3 (issue #1): Persist only UI state with sessionStorage so it survives
      // tab switches, screen lock, and mobile background eviction.
      // sessionStorage is cleared when the window/tab is closed (intentional fresh start).
      name: "morning-routine-ui",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        runnerOpen: state.runnerOpen,
        managerOpen: state.managerOpen,
      }),
    }
  )
);
