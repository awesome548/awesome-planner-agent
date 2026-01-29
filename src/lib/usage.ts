import { getSupabaseClient } from "@/lib/supabase";

const TABLE = "usage_records";

type UsageRow = {
  used_on: string;
};

// Stores as: { "2026-01-24": true, ... }
export async function getUsageMap(): Promise<Record<string, boolean>> {
  if (typeof window === "undefined") return {};

  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from(TABLE).select("used_on");

  if (error || !data) return {};

  const map: Record<string, boolean> = {};
  for (const row of data as UsageRow[]) {
    map[row.used_on] = true;
  }
  return map;
}

export async function markTodayUsed() {
  if (typeof window === "undefined") return;

  const supabase = getSupabaseClient();
  const today = new Date();
  const key = toISODate(today);

  await supabase.from(TABLE).upsert({ used_on: key }, { onConflict: "used_on" });
}

export function toISODate(d: Date) {
  // local date -> YYYY-MM-DD
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
