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
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const { data, error } = await supabase
    .from(TABLE)
    .select("used_on")
    .gte("used_on", toISODate(oneYearAgo));

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
      const supabase = getSupabaseClient();

      // Read actual DB state to determine toggle direction (onMutate already flipped the cache)
      const { data: row } = await supabase
        .from(TABLE)
        .select("used_on")
        .eq("user_id", userId)
        .eq("used_on", dateKey)
        .maybeSingle();

      const newValue = !row;

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
