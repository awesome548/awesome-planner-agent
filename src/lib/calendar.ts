import type { CalendarEvent } from "@/lib/google";
import type { Plan } from "@/lib/schemas";

type PlannedTask = Plan["tasks"][number];

type DateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

export type BusyInterval = {
  startUtc: Date;
  endUtc: Date;
  sourceId?: string;
  summary?: string;
};

const DEFAULT_PARTS_OPTIONS = {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
} as const;

const DATE_PARTS_OPTIONS = {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
} as const;

function getDateParts(date: Date, timeZone: string): DateParts {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    ...DEFAULT_PARTS_OPTIONS,
  });
  const parts = formatter.formatToParts(date);
  const map = parts.reduce<Record<string, string>>((acc, part) => {
    if (part.type !== "literal") {
      return { ...acc, [part.type]: part.value };
    }
    return acc;
  }, {});

  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

export function getLocalDateString(timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    ...DATE_PARTS_OPTIONS,
  });
  return formatter.format(new Date());
}

export function isValidTimeZone(timeZone: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format();
    return true;
  } catch {
    return false;
  }
}

function zonedTimeToUtc(dateString: string, timeString: string, timeZone: string) {
  const [year, month, day] = dateString.split("-").map((value) => Number(value));
  const [hour, minute, second = "0"] = timeString.split(":");
  const utcGuess = new Date(
    Date.UTC(year, month - 1, day, Number(hour), Number(minute), Number(second))
  );
  const zonedParts = getDateParts(utcGuess, timeZone);
  const zonedGuess = new Date(
    Date.UTC(
      zonedParts.year,
      zonedParts.month - 1,
      zonedParts.day,
      zonedParts.hour,
      zonedParts.minute,
      zonedParts.second
    )
  );
  const offsetMs = utcGuess.getTime() - zonedGuess.getTime();
  return new Date(utcGuess.getTime() + offsetMs);
}

export function getDayBoundsUtc(dateString: string, timeZone: string) {
  const startUtc = zonedTimeToUtc(dateString, "00:00:00", timeZone);
  const endUtc = zonedTimeToUtc(dateString, "23:59:59", timeZone);
  return {
    startUtc,
    endUtc,
    timeMin: startUtc.toISOString(),
    timeMax: endUtc.toISOString(),
  };
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

export function taskToInterval(task: PlannedTask, timeZone: string): BusyInterval {
  const startUtc = zonedTimeToUtc(task.date, `${task.start_time}:00`, timeZone);
  const endUtc = addMinutes(startUtc, task.duration_minutes);
  return {
    startUtc,
    endUtc,
    summary: task.title,
  };
}

export function eventToInterval(event: CalendarEvent, timeZone: string): BusyInterval | null {
  const startDateTime = event.start?.dateTime;
  const endDateTime = event.end?.dateTime;
  const startDate = event.start?.date;
  const endDate = event.end?.date;

  if (startDateTime && endDateTime) {
    const startUtc = new Date(startDateTime);
    const endUtc = new Date(endDateTime);
    return { startUtc, endUtc, sourceId: event.id, summary: event.summary };
  }

  if (startDate && endDate) {
    const startUtc = zonedTimeToUtc(startDate, "00:00:00", timeZone);
    const endUtc = zonedTimeToUtc(endDate, "00:00:00", timeZone);
    return { startUtc, endUtc, sourceId: event.id, summary: event.summary };
  }

  return null;
}

export function toBusyIntervals(events: CalendarEvent[], timeZone: string) {
  return events
    .map((event) => eventToInterval(event, timeZone))
    .filter((interval): interval is BusyInterval => Boolean(interval));
}

export function hasOverlap(a: BusyInterval, b: BusyInterval) {
  return a.startUtc < b.endUtc && b.startUtc < a.endUtc;
}

export function findConflicts(tasks: PlannedTask[], busy: BusyInterval[], timeZone: string) {
  const taskIntervals = tasks.map((task) => taskToInterval(task, timeZone));
  return taskIntervals
    .map((interval, index) => {
      const overlapping = busy.filter((event) => hasOverlap(interval, event));
      if (overlapping.length === 0) {
        return null;
      }
      return {
        task: tasks[index],
        overlapping,
      };
    })
    .filter(
      (conflict): conflict is { task: PlannedTask; overlapping: BusyInterval[] } =>
        Boolean(conflict)
    );
}

export function getLocalDateTimeLabel(timeZone: string) {
  const parts = getDateParts(new Date(), timeZone);
  const yyyy = parts.year;
  const mm = String(parts.month).padStart(2, "0");
  const dd = String(parts.day).padStart(2, "0");
  const hh = String(parts.hour).padStart(2, "0");
  const min = String(parts.minute).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}
