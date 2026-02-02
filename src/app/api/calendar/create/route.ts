import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/auth";
import {
  findConflicts,
  getDayBoundsUtc,
  getLocalDateString,
  isValidTimeZone,
  toBusyIntervals,
} from "@/lib/calendar";
import { insertCalendarEvent, listCalendarEvents } from "@/lib/google";
import { PlanSchema } from "@/lib/schemas";

const CreateCalendarSchema = z.object({
  plan: PlanSchema,
  timeZone: z.string().trim().min(1),
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

  try {
    const parsedBody = CreateCalendarSchema.safeParse(await req.json());
    if (!parsedBody.success) {
      return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
    }

    const timeZone = parsedBody.data.timeZone;
    if (!isValidTimeZone(timeZone)) {
      return NextResponse.json({ ok: false, error: "Invalid time zone" }, { status: 400 });
    }
    const today = getLocalDateString(timeZone);
    const tasks = parsedBody.data.plan.tasks;
    const invalidTask = tasks.find((task) => task.date !== today);
    if (invalidTask) {
      return NextResponse.json(
        { ok: false, error: `Tasks must be scheduled for ${today}` },
        { status: 400 }
      );
    }

    const dayBounds = getDayBoundsUtc(today, timeZone);
    const eventsResult = await listCalendarEvents({
      accessToken,
      timeMin: dayBounds.timeMin,
      timeMax: dayBounds.timeMax,
      timeZone,
    });

    if (!eventsResult.ok) {
      return NextResponse.json(
        { ok: false, error: eventsResult.error ?? "Failed to load calendar events" },
        { status: 502 }
      );
    }

    const busyIntervals = toBusyIntervals(eventsResult.events ?? [], timeZone);
    const conflicts = findConflicts(tasks, busyIntervals, timeZone);
    if (conflicts.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "Draft tasks overlap existing calendar events",
          conflicts,
        },
        { status: 409 }
      );
    }

    const results = await tasks.reduce(
      async (accPromise, task) => {
        const acc = await accPromise;
        const result = await insertCalendarEvent({ task, accessToken, timeZone });
        return [...acc, result];
      },
      Promise.resolve([] as Awaited<ReturnType<typeof insertCalendarEvent>>[])
    );

    const createdCount = results.filter((r) => r.ok).length;
    const errors = results.filter((r) => !r.ok).map((r) => r.error ?? "Unknown error");

    if (errors.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          error: `Created ${createdCount} events, ${errors.length} failed`,
          createdCount,
          errors,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true, createdCount });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Failed to create events" },
      { status: 500 }
    );
  }
}
