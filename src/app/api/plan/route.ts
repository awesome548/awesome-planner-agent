import { NextResponse } from "next/server";
import OpenAI from "openai";
import { env } from "@/lib/env";
import { fetchPlannerRulesFromNotion } from "@/lib/notion";
import { PlanSchema } from "@/lib/schemas";
import { zodTextFormat } from "openai/helpers/zod";


export async function POST(req: Request) {
  try {
    const { text, timeZone } = await req.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json({ ok: false, error: "Missing text" }, { status: 400 });
    }
    if (!env.OPENAI_API_KEY) {
      return NextResponse.json({ ok: false, error: "Missing OPENAI_API_KEY" }, { status: 500 });
    }
    const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

    const notionRules = await fetchPlannerRulesFromNotion();

    // JSON Schema for OpenAI Structured Outputs
    // Keep it simple to avoid schema pitfalls (required must include all keys).
    console.log("good")
    const tz =
      typeof timeZone === "string" && timeZone.trim() ? timeZone.trim() : "UTC";
    const today = new Date().toLocaleDateString("en-CA", { timeZone: tz });

    const response = await openai.responses.create({
      model: "gpt-4o-mini",
      input: [
        {
          role: "system",
          content:
            "You are an expert planning assistant. You must output JSON that matches the provided schema exactly.",
        },
        {
          role: "user",
          content: `User input:\n${text}\n\nToday (local to user): ${today} (time zone: ${tz})\n\nPlanner rules (from Notion):\n${notionRules}`,
        },
      ],
      text: {
        format: zodTextFormat(PlanSchema, "plan"),
      },
    });

    // Extract JSON
    const json = response.output_text ? JSON.parse(response.output_text) : null;

    // Validate with Zod
    const parsed = PlanSchema.parse(json);

    return NextResponse.json({ ok: true, plan: parsed, rules_preview: notionRules.slice(0, 400) });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
