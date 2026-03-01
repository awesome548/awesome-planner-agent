import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import {
  getDayBoundsUtc,
  getLocalDateString,
  getLocalDateTimeLabel,
  isValidTimeZone,
  toBusyIntervals,
} from "@/lib/calendar";
import { listCalendarEvents } from "@/lib/google";
import { fetchPlannerRulesFromNotion } from "@/lib/notion";

const PrepareRequestSchema = z.object({
  timeZone: z.string().trim().min(1),
  calendarId: z.string().trim().min(1).optional(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
  }

  const accessToken = (session as any).access_token as string | undefined;
  if (!accessToken) {
    return NextResponse.json(
      { ok: false, error: "Missing Google access token" },
      { status: 401 }
    );
  }

  const parsedRequest = PrepareRequestSchema.safeParse(await req.json());
  if (!parsedRequest.success) {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }

  const { timeZone, calendarId } = parsedRequest.data;
  if (!isValidTimeZone(timeZone)) {
    return NextResponse.json({ ok: false, error: "Invalid time zone" }, { status: 400 });
  }

  try {
    const today = getLocalDateString(timeZone);
    const nowLocal = getLocalDateTimeLabel(timeZone);
    const dayBounds = getDayBoundsUtc(today, timeZone);

    const [eventsResult, notionRules] = await Promise.all([
      listCalendarEvents({
        accessToken,
        timeMin: dayBounds.timeMin,
        timeMax: dayBounds.timeMax,
        timeZone,
        calendarId,
      }),
      fetchPlannerRulesFromNotion(),
    ]);

    if (!eventsResult.ok) {
      return NextResponse.json(
        { ok: false, error: eventsResult.error ?? "Failed to load calendar events" },
        { status: 502 }
      );
    }

    const busyIntervals = toBusyIntervals(eventsResult.events ?? [], timeZone);
    const timeFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    const busySummary = busyIntervals.map((interval) => ({
      start: timeFormatter.format(interval.startUtc),
      end: timeFormatter.format(interval.endUtc),
      title: interval.summary ?? "Busy",
    }));

    // Serialize Date objects for client roundtrip
    const busyIntervalsIso = busyIntervals.map((interval) => ({
      startUtc: interval.startUtc.toISOString(),
      endUtc: interval.endUtc.toISOString(),
      summary: interval.summary ?? null,
    }));

    return NextResponse.json({
      ok: true,
      today,
      nowLocal,
      busySummary,
      busyIntervalsIso,
      notionRules,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
