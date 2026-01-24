import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { PlanSchema } from "@/lib/schemas";
import { insertCalendarEvent } from "@/lib/google";

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
    const body = await req.json();
    const parsedPlan = PlanSchema.safeParse(body?.plan);
    if (!parsedPlan.success) {
      return NextResponse.json({ ok: false, error: "Invalid plan payload" }, { status: 400 });
    }

    const timeZone =
      typeof body?.timeZone === "string" && body.timeZone.trim()
        ? body.timeZone.trim()
        : "UTC";

    const results = [];
    for (const task of parsedPlan.data.tasks) {
      // Sequential insert keeps ordering predictable and avoids quota spikes.
      const result = await insertCalendarEvent({ task, accessToken, timeZone });
      results.push(result);
    }

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
