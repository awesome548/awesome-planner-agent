import { NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { zodTextFormat } from "openai/helpers/zod";
import { authOptions } from "@/auth";
import { findConflicts } from "@/lib/calendar";
import { env } from "@/lib/env";
import { PlanSchema } from "@/lib/schemas";

const OPENAI_MODEL = env.OPENAI_MODEL ?? "gpt-5-mini-2025-08-07";
const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

const GenerateRequestSchema = z.object({
  text: z.string().trim().min(1),
  timeZone: z.string().trim().min(1),
  today: z.string(),
  nowLocal: z.string(),
  busySummary: z.array(
    z.object({ start: z.string(), end: z.string(), title: z.string() })
  ),
  busyIntervalsIso: z.array(
    z.object({
      startUtc: z.string(),
      endUtc: z.string(),
      summary: z.string().nullable(),
    })
  ),
  notionRules: z.string(),
});

const CREATE_PLAN_SYSTEM_PROMPT =
  "You are an expert planning assistant. You must output JSON that matches the provided schema exactly.";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
  }

  if (!env.OPENAI_API_KEY) {
    return NextResponse.json(
      { ok: false, error: "Missing OPENAI_API_KEY" },
      { status: 500 }
    );
  }

  try {
    const parsedRequest = GenerateRequestSchema.safeParse(await req.json());
    if (!parsedRequest.success) {
      return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
    }

    const { text, timeZone, today, nowLocal, busySummary, busyIntervalsIso, notionRules } =
      parsedRequest.data;

    const promptContent = `User input:\n${text}\n\nToday (local to user): ${nowLocal}\n\nScheduling rule: Only schedule tasks for ${today}. Consider current local time and plan events ahead. Do not schedule any task in the past.\n\nExisting busy times (local):\n${JSON.stringify(
      busySummary
    )}\n\nDo not schedule tasks overlapping those busy times.\n\nPlanner rules (from Notion):\n${notionRules}`;

    const reasoningEffort = env.OPENAI_REASONING_EFFORT;
    const response = await openai.responses.create({
      model: OPENAI_MODEL,
      input: [
        { role: "system", content: CREATE_PLAN_SYSTEM_PROMPT },
        { role: "user", content: promptContent },
      ],
      text: { format: zodTextFormat(PlanSchema, "plan") },
      ...(reasoningEffort ? { reasoning: { effort: reasoningEffort } } : {}),
    });

    const json = response.output_text ? JSON.parse(response.output_text) : null;
    const parsedPlan = PlanSchema.parse(json);

    const busyIntervals = busyIntervalsIso.map((interval) => ({
      startUtc: new Date(interval.startUtc),
      endUtc: new Date(interval.endUtc),
      summary: interval.summary ?? undefined,
    }));

    const conflicts = findConflicts(parsedPlan.tasks, busyIntervals, timeZone);
    const warning =
      conflicts.length > 0
        ? "Generated plan includes overlaps with existing calendar events."
        : undefined;

    return NextResponse.json({
      ok: true,
      plan: parsedPlan,
      warning,
      conflicts,
      rules_preview: notionRules.slice(0, 400),
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
