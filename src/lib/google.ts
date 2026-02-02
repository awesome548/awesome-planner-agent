import type { Plan } from "@/lib/schemas";

type PlannedTask = Plan["tasks"][number];

type InsertEventInput = {
  task: PlannedTask;
  accessToken: string;
  timeZone: string;
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

const GOOGLE_CALENDAR_EVENTS_ENDPOINT =
  "https://www.googleapis.com/calendar/v3/calendars/primary/events";

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
}: Pick<ListEventsInput, "timeMin" | "timeMax" | "timeZone">) {
  const params = new URLSearchParams({
    singleEvents: "true",
    orderBy: "startTime",
    timeMin,
    timeMax,
    timeZone,
  });
  return `${GOOGLE_CALENDAR_EVENTS_ENDPOINT}?${params.toString()}`;
}

export async function listCalendarEvents({
  accessToken,
  timeMin,
  timeMax,
  timeZone,
}: ListEventsInput): Promise<ListEventsResult> {
  const url = buildEventsListUrl({ timeMin, timeMax, timeZone });

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
    const res = await fetch(GOOGLE_CALENDAR_EVENTS_ENDPOINT, {
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
