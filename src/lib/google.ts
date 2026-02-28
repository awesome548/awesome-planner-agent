import type { Plan } from "@/lib/schemas";

type PlannedTask = Plan["tasks"][number];

type InsertEventInput = {
  task: PlannedTask;
  accessToken: string;
  timeZone: string;
  calendarId?: string;
};

type InsertEventResult = {
  ok: boolean;
  id?: string;
  error?: string;
};

type ListEventsInput = {
  accessToken: string;
  timeMin: string;
  timeMax: string;
  timeZone: string;
  calendarId?: string;
};

export type CalendarEvent = {
  id?: string;
  summary?: string;
  start?: {
    dateTime?: string;
    date?: string;
  };
  end?: {
    dateTime?: string;
    date?: string;
  };
};

type ListEventsResult = {
  ok: boolean;
  events?: CalendarEvent[];
  error?: string;
};

export type UserCalendar = {
  id: string;
  summary: string;
  primary?: boolean;
  accessRole?: string;
};

type ListCalendarsResult = {
  ok: boolean;
  calendars?: UserCalendar[];
  error?: string;
};

const GOOGLE_CALENDAR_BASE = "https://www.googleapis.com/calendar/v3";

function calendarEventsEndpoint(calendarId: string) {
  return `${GOOGLE_CALENDAR_BASE}/calendars/${encodeURIComponent(calendarId)}/events`;
}

function addMinutesToDateTime(date: string, time: string, minutes: number) {
  const [year, month, day] = date.split("-").map((value) => Number(value));
  const [hour, minute] = time.split(":").map((value) => Number(value));
  const startUtc = Date.UTC(year, month - 1, day, hour, minute);
  const endUtc = new Date(startUtc + minutes * 60 * 1000);

  const endDate = [
    endUtc.getUTCFullYear(),
    String(endUtc.getUTCMonth() + 1).padStart(2, "0"),
    String(endUtc.getUTCDate()).padStart(2, "0"),
  ].join("-");
  const endTime = [
    String(endUtc.getUTCHours()).padStart(2, "0"),
    String(endUtc.getUTCMinutes()).padStart(2, "0"),
  ].join(":");

  return { endDate, endTime };
}

function buildEventsListUrl({
  timeMin,
  timeMax,
  timeZone,
  calendarId = "primary",
}: Pick<ListEventsInput, "timeMin" | "timeMax" | "timeZone" | "calendarId">) {
  const params = new URLSearchParams({
    singleEvents: "true",
    orderBy: "startTime",
    timeMin,
    timeMax,
    timeZone,
  });
  return `${calendarEventsEndpoint(calendarId)}?${params.toString()}`;
}

export async function listUserCalendars(accessToken: string): Promise<ListCalendarsResult> {
  const url = `${GOOGLE_CALENDAR_BASE}/users/me/calendarList`;
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      let errorMessage = `Google Calendar error (${res.status})`;
      try {
        const body = await res.json();
        if (body?.error?.message) errorMessage = body.error.message;
      } catch {
        // ignore JSON parsing errors
      }
      return { ok: false, error: errorMessage };
    }

    const data = await res.json();
    const items: UserCalendar[] = Array.isArray(data?.items)
      ? data.items.map((item: any) => ({
          id: item.id,
          summary: item.summary ?? item.id,
          primary: item.primary ?? false,
          accessRole: item.accessRole,
        }))
      : [];
    return { ok: true, calendars: items };
  } catch (err: any) {
    return { ok: false, error: err?.message ?? "Failed to reach Google Calendar API" };
  }
}

export async function listCalendarEvents({
  accessToken,
  timeMin,
  timeMax,
  timeZone,
  calendarId = "primary",
}: ListEventsInput): Promise<ListEventsResult> {
  const url = buildEventsListUrl({ timeMin, timeMax, timeZone, calendarId });

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      let errorMessage = `Google Calendar error (${res.status})`;
      try {
        const body = await res.json();
        if (body?.error?.message) {
          errorMessage = body.error.message;
        }
      } catch {
        // ignore JSON parsing errors
      }
      return { ok: false, error: errorMessage };
    }

    const data = await res.json();
    const events = Array.isArray(data?.items) ? (data.items as CalendarEvent[]) : [];
    return { ok: true, events };
  } catch (err: any) {
    return { ok: false, error: err?.message ?? "Failed to reach Google Calendar API" };
  }
}

export async function insertCalendarEvent({
  task,
  accessToken,
  timeZone,
  calendarId = "primary",
}: InsertEventInput): Promise<InsertEventResult> {
  const { endDate, endTime } = addMinutesToDateTime(
    task.date,
    task.start_time,
    task.duration_minutes
  );

  const payload = {
    summary: task.title,
    description: task.notes ?? undefined,
    start: {
      dateTime: `${task.date}T${task.start_time}:00`,
      timeZone,
    },
    end: {
      dateTime: `${endDate}T${endTime}:00`,
      timeZone,
    },
  };

  try {
    const res = await fetch(calendarEventsEndpoint(calendarId), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      let errorMessage = `Google Calendar error (${res.status})`;
      try {
        const body = await res.json();
        if (body?.error?.message) {
          errorMessage = body.error.message;
        }
      } catch {
        // ignore JSON parsing errors
      }
      return { ok: false, error: errorMessage };
    }

    const data = await res.json();
    return { ok: true, id: data?.id };
  } catch (err: any) {
    return { ok: false, error: err?.message ?? "Failed to reach Google Calendar API" };
  }
}
