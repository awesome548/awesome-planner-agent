import { NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { zodTextFormat } from "openai/helpers/zod";
import { authOptions } from "@/auth";
import {
  findConflicts,
  getDayBoundsUtc,
  getLocalDateString,
  getLocalDateTimeLabel,
  isValidTimeZone,
  toBusyIntervals,
} from "@/lib/calendar";
import { env } from "@/lib/env";
import { listCalendarEvents } from "@/lib/google";
import { fetchPlannerRulesFromNotion } from "@/lib/notion";
import { PlanSchema } from "@/lib/schemas";

const PlanRequestSchema = z.object({
  text: z.string().trim().min(1),
  timeZone: z.string().trim().min(1),
});

const CREATE_PLAN_SYSTEM_PROMPT =
  "You are an expert planning assistant. You must output JSON that matches the provided schema exactly.";

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
    const parsedRequest = PlanRequestSchema.safeParse(await req.json());
    if (!parsedRequest.success) {
      return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
    }

    if (!env.OPENAI_API_KEY) {
      return NextResponse.json({ ok: false, error: "Missing OPENAI_API_KEY" }, { status: 500 });
    }

    const { text, timeZone } = parsedRequest.data;
    const tz = timeZone;
    if (!isValidTimeZone(tz)) {
      return NextResponse.json({ ok: false, error: "Invalid time zone" }, { status: 400 });
    }
    const today = getLocalDateString(tz);
    const nowLocal = getLocalDateTimeLabel(tz);
    const dayBounds = getDayBoundsUtc(today, tz);

    const eventsResult = await listCalendarEvents({
      accessToken,
      timeMin: dayBounds.timeMin,
      timeMax: dayBounds.timeMax,
      timeZone: tz,
    });

    if (!eventsResult.ok) {
      return NextResponse.json(
        { ok: false, error: eventsResult.error ?? "Failed to load calendar events" },
        { status: 502 }
      );
    }

    const busyIntervals = toBusyIntervals(eventsResult.events ?? [], tz);
    const timeFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    const busySummary = busyIntervals.map((interval) => ({
      start: timeFormatter.format(interval.startUtc),
      end: timeFormatter.format(interval.endUtc),
      title: interval.summary ?? "Busy",
    }));

    const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    const notionRules = await fetchPlannerRulesFromNotion();
    const promptContent = `User input:\n${text}\n\nToday (local to user): ${nowLocal}\n\nScheduling rule: Only schedule tasks for ${today}. Consider current local time and plan events ahead. Do not schedule any task in the past.\n\nExisting busy times (local):\n${JSON.stringify(
      busySummary
    )}\n\nDo not schedule tasks overlapping those busy times.\n\nPlanner rules (from Notion):\n${notionRules}`
    console.log(promptContent);
    const response = await openai.responses.create({
      model: "gpt-5-mini-2025-08-07",
      input: [
        {
          role: "system",
          content: CREATE_PLAN_SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: promptContent,
        },
      ],
      text: {
        format: zodTextFormat(PlanSchema, "plan"),
      },
    });

    const json = response.output_text ? JSON.parse(response.output_text) : null;
    const parsedPlan = PlanSchema.parse(json);

    const conflicts = findConflicts(parsedPlan.tasks, busyIntervals, tz);
    if (conflicts.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "Generated plan overlaps existing calendar events",
          conflicts,
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      ok: true,
      plan: parsedPlan,
      rules_preview: notionRules.slice(0, 400),
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
