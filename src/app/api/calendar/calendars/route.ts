import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { listUserCalendars } from "@/lib/google";

export async function GET() {
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

  const result = await listUserCalendars(accessToken);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error ?? "Failed to fetch calendars" },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true, calendars: result.calendars });
}
