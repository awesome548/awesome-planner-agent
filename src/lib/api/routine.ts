import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSupabaseClient } from "@/lib/supabase";
import { useAuthStore } from "@/lib/auth-store";
import { toISODate } from "@/lib/utils";
import { queryKeys } from "./keys";

const ROUTINE_TABLE = "morning_routine_actions";
const COMPLETION_TABLE = "morning_routine_completions";
const ACTION_RECORDS_TABLE = "morning_routine_action_records";

function immutableReorder(items: RoutineAction[], startIndex: number, endIndex: number): RoutineAction[] {
  const moved = items[startIndex];
  const without = items.filter((_, i) => i !== startIndex);
  const reordered = [...without.slice(0, endIndex), moved, ...without.slice(endIndex)];
  return reordered.map((a, index) => ({ ...a, position: index }));
}

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
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      const { data, error } = await supabase
        .from(COMPLETION_TABLE)
        .select("completed_on, completed")
        .gte("completed_on", toISODate(oneYearAgo));

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
    mutationFn: async ({ title, id }: { title: string; id: string }) => {
      const userId = getUserId();
      if (!userId) throw new Error("Not authenticated");

      const actions = queryClient.getQueryData<RoutineAction[]>(queryKeys.routine.actions()) ?? [];
      const newAction: RoutineAction = {
        id,
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
    onMutate: async ({ title, id }: { title: string; id: string }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.routine.actions() });
      const previous = queryClient.getQueryData<RoutineAction[]>(queryKeys.routine.actions()) ?? [];
      const newAction: RoutineAction = {
        id,
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
      const normalized = immutableReorder(actions, startIndex, endIndex);

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
      const normalized = immutableReorder(previous, startIndex, endIndex);
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
    mutationFn: async ({ actionId, date = new Date(), recordId }: { actionId: string; date?: Date; recordId: string }) => {
      const userId = getUserId();
      if (!userId) throw new Error("Not authenticated");

      const dateKey = toISODate(date);
      const supabase = getSupabaseClient();

      // Read actual DB state — not the optimistic cache (which onMutate already flipped)
      const { data: row } = await supabase
        .from(ACTION_RECORDS_TABLE)
        .select("id, completed")
        .eq("action_id", actionId)
        .eq("completed_on", dateKey)
        .eq("user_id", userId)
        .maybeSingle();

      const newCompleted = !(row?.completed ?? false);
      const updated: RoutineActionRecord = {
        id: row?.id || recordId,
        action_id: actionId,
        completed_on: dateKey,
        completed: newCompleted,
      };

      const { error } = await supabase
        .from(ACTION_RECORDS_TABLE)
        .upsert(
          { ...updated, user_id: userId },
          { onConflict: "user_id,action_id,completed_on" }
        );

      if (error) throw new Error(error.message);
      return updated;
    },
    onMutate: async ({ actionId, date = new Date(), recordId }: { actionId: string; date?: Date; recordId: string }) => {
      const dateKey = toISODate(date);
      await queryClient.cancelQueries({ queryKey: queryKeys.routine.records(dateKey) });
      const previous = queryClient.getQueryData<ActionRecordMap>(queryKeys.routine.records(dateKey)) ?? {};
      const existing = previous[actionId];
      const newCompleted = !existing?.completed;

      const updated: RoutineActionRecord = {
        id: existing?.id || recordId,
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
