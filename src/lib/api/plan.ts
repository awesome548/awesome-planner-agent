import { useQuery, useMutation } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiFetch } from "./client";
import { queryKeys } from "./keys";

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
