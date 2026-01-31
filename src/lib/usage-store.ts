import { create } from "zustand";
import { getSupabaseClient } from "@/lib/supabase";
import { toISODate } from "@/lib/utils";

const TABLE = "usage_records";

type UsageRow = {
  used_on: string;
};

interface UsageStore {
  // State
  usageMap: Record<string, boolean>;
  loading: boolean;

  // Actions
  initialize: () => Promise<void>;
  markUsed: (date?: Date) => Promise<void>;
  toggleUsed: (date: Date) => Promise<void>;
}

export const useUsageStore = create<UsageStore>((set, get) => ({
  // Initial state
  usageMap: {},
  loading: true,

  // Initialize - fetch all usage data once
  initialize: async () => {
    if (typeof window === "undefined") return;

    const supabase = getSupabaseClient();

    try {
      const { data, error } = await supabase.from(TABLE).select("used_on");

      if (error || !data) {
        set({ loading: false });
        return;
      }

      const usageMap: Record<string, boolean> = {};
      for (const row of data as UsageRow[]) {
        usageMap[row.used_on] = true;
      }

      set({ usageMap, loading: false });
    } catch (error) {
      console.error("Failed to initialize usage store:", error);
      set({ loading: false });
    }
  },

  // Mark a date as used
  markUsed: async (date = new Date()) => {
    if (typeof window === "undefined") return;

    const { usageMap } = get();
    const dateKey = toISODate(date);

    set({
      usageMap: {
        ...usageMap,
        [dateKey]: true,
      },
    });

    const supabase = getSupabaseClient();
    await supabase.from(TABLE).upsert({ used_on: dateKey }, { onConflict: "used_on" });
  },

  // Toggle usage for a date (for manual editing)
  toggleUsed: async (date: Date) => {
    if (typeof window === "undefined") return;

    const { usageMap } = get();
    const dateKey = toISODate(date);
    const newValue = !usageMap[dateKey];

    set({
      usageMap: {
        ...usageMap,
        [dateKey]: newValue,
      },
    });

    const supabase = getSupabaseClient();

    if (newValue) {
      await supabase.from(TABLE).upsert({ used_on: dateKey }, { onConflict: "used_on" });
    } else {
      await supabase.from(TABLE).delete().eq("used_on", dateKey);
    }
  },
}));