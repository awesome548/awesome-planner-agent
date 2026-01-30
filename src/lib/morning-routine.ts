import { getSupabaseClient } from "@/lib/supabase";
import { toISODate } from "@/lib/usage";

const ROUTINE_TABLE = "morning_routine_actions";
const COMPLETION_TABLE = "morning_routine_completions";

export type RoutineAction = {
  id: string;
  title: string;
  duration_minutes: number;
  position: number;
};

type RoutineRow = {
  id: string;
  title: string;
  duration_minutes: number;
  position: number;
};

type CompletionRow = {
  completed_on: string;
  completed: boolean;
};

export async function getRoutineActions(): Promise<RoutineAction[]> {
  if (typeof window === "undefined") return [];

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(ROUTINE_TABLE)
    .select("id,title,duration_minutes,position")
    .order("position", { ascending: true });

  if (error || !data) return [];

  return data as RoutineRow[];
}

export async function upsertRoutineAction(action: RoutineAction) {
  if (typeof window === "undefined") return;

  const supabase = getSupabaseClient();
  await supabase.from(ROUTINE_TABLE).upsert(action, { onConflict: "id" });
}

export async function deleteRoutineAction(id: string) {
  if (typeof window === "undefined") return;

  const supabase = getSupabaseClient();
  await supabase.from(ROUTINE_TABLE).delete().eq("id", id);
}

export async function updateRoutineOrder(actions: RoutineAction[]) {
  if (typeof window === "undefined") return;

  const supabase = getSupabaseClient();
  const payload = actions.map((action, index) => ({
    id: action.id,
    position: index,
  }));

  await supabase.from(ROUTINE_TABLE).upsert(payload, { onConflict: "id" });
}

export async function getRoutineCompletionMap(): Promise<Record<string, boolean>> {
  if (typeof window === "undefined") return {};

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(COMPLETION_TABLE)
    .select("completed_on,completed");

  if (error || !data) return {};

  const map: Record<string, boolean> = {};
  for (const row of data as CompletionRow[]) {
    map[row.completed_on] = Boolean(row.completed);
  }
  return map;
}

export async function setRoutineCompletion(date: Date, completed: boolean) {
  if (typeof window === "undefined") return;

  const supabase = getSupabaseClient();
  const key = toISODate(date);
  await supabase
    .from(COMPLETION_TABLE)
    .upsert({ completed_on: key, completed }, { onConflict: "completed_on" });
}

export async function markTodayRoutineCompleted() {
  await setRoutineCompletion(new Date(), true);
}
